import { NextResponse } from "next/server";
import { z } from "zod";
import {
  KieApiError,
  KieMusicClient,
  KieSubmissionUnknownError,
} from "@/lib/music/kie-client";
import {
  getKieEstimatedCreditsMillis,
  getKieModel,
  requireGenerationBudgetConfig,
  requireKieLiveConfig,
} from "@/lib/music/kie-env";
import { effectiveMusicMode, getApplicationSettings } from "@/lib/admin/settings";
import { getKieApiKey, getKieWebhookHmacKey } from "@/lib/admin/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { musicStyleWithVoice, type VoicePreference } from "@/lib/order-options";

const idSchema = z.string().uuid();

type ReservedTask = {
  task_id: string;
  status: string;
  external_task_id: string | null;
  model: string;
  created: boolean;
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, recipient_name, style, voice_preference")
      .eq("id", orderId.data)
      .eq("owner_id", authData.user.id)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: approvedLyrics } = await supabase
      .from("lyrics")
      .select("id, content, revision")
      .eq("order_id", orderId.data)
      .eq("kind", "approved")
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!approvedLyrics) {
      return NextResponse.json({ error: "approved_lyrics_required" }, { status: 409 });
    }

    const admin = createSupabaseAdminClient();
    const settings = await getApplicationSettings(admin);
    const mode = effectiveMusicMode(settings.musicMode);
    const model = settings.musicModel ?? getKieModel();
    const estimatedCreditsMillis = mode === "live" ? getKieEstimatedCreditsMillis() : 0;
    const budget = requireGenerationBudgetConfig(mode);
    const [kieApiKey, webhookHmacKey] = mode === "live"
      ? await Promise.all([getKieApiKey(admin), getKieWebhookHmacKey(admin)])
      : [null, null];
    if (mode === "live" && !webhookHmacKey) {
      return NextResponse.json({ error: "generation_security_not_configured" }, { status: 503 });
    }
    const liveConfig = mode === "live" ? requireKieLiveConfig(mode, kieApiKey) : null;
    const { data: reservedData, error: reserveError } = await admin.rpc(
      "reserve_budgeted_original_generation",
      {
        target_order_id: orderId.data,
        target_owner_id: authData.user.id,
        requested_model: model,
        requested_credits_millis: estimatedCreditsMillis,
        requested_budget_scope: budget.scope,
        account_24h_limit_millis: budget.account24hCreditsMillis,
        environment_24h_limit_millis: budget.environment24hCreditsMillis,
      },
    );
    if (isBudgetError(reserveError)) {
      return NextResponse.json({ error: "generation_limit_reached" }, { status: 429 });
    }
    if (reserveError || !isReservedTask(reservedData)) {
      return NextResponse.json({ error: "order_not_generatable" }, { status: 409 });
    }
    const reserved = reservedData;

    if (reserved.status !== "created") {
      return NextResponse.json(
        generationResponse(reserved, mode),
        { status: reserved.status === "reconciling" ? 202 : 200 },
      );
    }

    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_generation_submission",
      { target_task_id: reserved.task_id },
    );
    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json(
        { taskId: reserved.task_id, status: "reconciling", mode },
        { status: 202 },
      );
    }

    if (mode === "mock") {
      const mockTaskId = `mock-${reserved.task_id}`;
      const { data: recorded, error: recordError } = await admin.rpc(
        "record_generation_submission",
        {
          target_task_id: reserved.task_id,
          provider_task_id: mockTaskId,
          estimated_credits_millis: 0,
        },
      );
      if (recordError || !recorded) throw recordError ?? new Error("mock_not_recorded");
      return NextResponse.json({
        taskId: reserved.task_id,
        status: "submitted",
        mode,
        simulated: true,
      });
    }

    try {
      const client = new KieMusicClient(liveConfig!.apiKey);
      const submission = await client.submitGeneration({
        approvedLyrics: approvedLyrics.content,
        style: musicStyleWithVoice(order.style, order.voice_preference as VoicePreference),
        title: `Canção para ${order.recipient_name}`.slice(0, 80),
        model,
        callbackUrl: liveConfig!.callbackUrl,
        vocalGender: order.voice_preference === "masculina" ? "m" : "f",
        ...(["V5_5", "V6", "V6_MINI", "V6_WILD"].includes(model) ? { durationSeconds: 180 } : {}),
      });
      const { data: recorded, error: recordError } = await admin.rpc(
        "record_generation_submission",
        {
          target_task_id: reserved.task_id,
          provider_task_id: submission.externalTaskId,
          estimated_credits_millis: estimatedCreditsMillis,
        },
      );
      if (recordError || !recorded) throw recordError ?? new Error("submission_not_recorded");
      return NextResponse.json({ taskId: reserved.task_id, status: "submitted", mode });
    } catch (error) {
      const acceptanceUnknown = error instanceof KieSubmissionUnknownError;
      const failureCode = error instanceof KieApiError
        ? `provider_http_${error.status}`
        : acceptanceUnknown
          ? "submission_unknown"
          : "submission_failed";
      await admin.rpc("record_generation_submission_failure", {
        target_task_id: reserved.task_id,
        failure_code: failureCode,
        acceptance_unknown: acceptanceUnknown,
      });
      return NextResponse.json(
        {
          taskId: reserved.task_id,
          status: acceptanceUnknown ? "reconciling" : "failed",
          mode,
        },
        { status: acceptanceUnknown ? 202 : 502 },
      );
    }
  } catch {
    return NextResponse.json({ error: "generation_unavailable" }, { status: 503 });
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId.data)
      .eq("owner_id", authData.user.id)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: task } = await supabase
      .from("generation_tasks")
      .select("id, status, model, error_code, accepted_at, completed_at, updated_at")
      .eq("order_id", orderId.data)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      task
        ? {
            taskId: task.id,
            status: task.status,
            model: task.model,
            errorCode: task.error_code,
            acceptedAt: task.accepted_at,
            completedAt: task.completed_at,
            updatedAt: task.updated_at,
          }
        : { taskId: null, status: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "generation_unavailable" }, { status: 503 });
  }
}

function isReservedTask(value: unknown): value is ReservedTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return typeof task.task_id === "string" &&
    typeof task.status === "string" &&
    typeof task.model === "string";
}

function generationResponse(task: ReservedTask, mode: "mock" | "live") {
  return {
    taskId: task.task_id,
    status: task.status,
    mode,
    simulated: mode === "mock",
  };
}

function isBudgetError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "");
  return message.includes("generation_budget_exceeded");
}
