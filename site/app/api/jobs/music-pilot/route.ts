import { NextResponse } from "next/server";
import { getApplicationSettings } from "@/lib/admin/settings";
import { getKieApiKey, getKieWebhookHmacKey } from "@/lib/admin/secrets";
import { AudioStorageError, copyFullAudioToPrivateStorage } from "@/lib/music/audio-storage";
import { processGenerationOutputBatch } from "@/lib/music/generation-output-worker";
import {
  KieApiError,
  KieMusicClient,
  KieSubmissionUnknownError,
} from "@/lib/music/kie-client";
import {
  getKieEstimatedCreditsMillis,
  hasKieAllowedAudioHostsConfigured,
  requireGenerationBudgetConfig,
  requireKieLiveConfig,
} from "@/lib/music/kie-env";
import { musicStyleWithVoice, type VoicePreference } from "@/lib/order-options";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAudioBucket } from "@/lib/supabase/audio-bucket";
import { createAndStoreMp3Preview, Mp3PreviewError } from "@/lib/music/mp3-preview";

export const maxDuration = 300;
const NO_STORE = { "Cache-Control": "private, no-store" };
const PILOT_REQUEST_ID = "c2e3b19e-6002-4f5f-b10d-66e0a0a8c901";
const PILOT_AUDIO_HOST = "tempfile.aiquickdraw.com";

type PilotOrder = {
  order_id: string;
  approved_lyric_id: string;
};

type ReservedTask = {
  task_id: string;
  status: string;
  created: boolean;
};

export async function POST(request: Request) {
  if (!authorized(request)) return response({ error: "not_found" }, 404);
  if (process.env.PILOT_TRIGGER_ENABLED?.trim() !== "true") {
    return response({ error: "pilot_trigger_disabled" }, 503);
  }

  const admin = createSupabaseAdminClient();
  let stage = "readiness";
  try {
    const [apiKey, webhookHmacKey, settings] = await Promise.all([
      getKieApiKey(admin),
      getKieWebhookHmacKey(admin),
      getApplicationSettings(admin),
    ]);
    if (!webhookHmacKey) return response({ error: "pilot_security_not_configured" }, 503);
    const liveConfig = requireKieLiveConfig("live", apiKey);
    const budget = requireGenerationBudgetConfig("live");
    const creditsMillis = getKieEstimatedCreditsMillis();

    stage = "prepare_order";
    const { data: pilotData, error: pilotError } = await admin.rpc("prepare_single_music_pilot");
    if (pilotError || !isPilotOrder(pilotData)) throw pilotError ?? new Error("pilot_not_prepared");

    stage = "load_order";
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, owner_id, recipient_name, style, voice_preference")
      .eq("id", pilotData.order_id)
      .single();
    const { data: lyric, error: lyricError } = await admin
      .from("lyrics")
      .select("id, content")
      .eq("id", pilotData.approved_lyric_id)
      .single();
    if (orderError || lyricError || !order || !lyric) throw orderError ?? lyricError ?? new Error("pilot_data_missing");

    stage = "reserve_budget";
    const { data: reservedData, error: reserveError } = await admin.rpc(
      "reserve_budgeted_original_generation",
      {
        target_order_id: order.id,
        target_owner_id: order.owner_id,
        requested_model: settings.musicModel,
        requested_credits_millis: creditsMillis,
        requested_budget_scope: budget.scope,
        account_24h_limit_millis: budget.account24hCreditsMillis,
        environment_24h_limit_millis: budget.environment24hCreditsMillis,
      },
    );
    if (reserveError || !isReservedTask(reservedData)) throw reserveError ?? new Error("pilot_not_reserved");
    if (reservedData.status !== "created") {
      return response({ orderId: order.id, taskId: reservedData.task_id, status: reservedData.status, submitted: false }, 200);
    }

    stage = "claim_submission";
    const { data: claimed, error: claimError } = await admin.rpc("claim_generation_submission", {
      target_task_id: reservedData.task_id,
    });
    if (claimError) throw claimError;
    if (!claimed) return response({ orderId: order.id, taskId: reservedData.task_id, status: "reconciling", submitted: false }, 202);

    try {
      stage = "submit_provider";
      const client = new KieMusicClient(liveConfig.apiKey);
      const submission = await client.submitGeneration({
        approvedLyrics: lyric.content,
        style: musicStyleWithVoice(order.style, order.voice_preference as VoicePreference),
        title: "Nossa História Virou Canção",
        model: settings.musicModel,
        callbackUrl: liveConfig.callbackUrl,
        vocalGender: "f",
        durationSeconds: 180,
      });
      const { data: recorded, error: recordError } = await admin.rpc("record_generation_submission", {
        target_task_id: reservedData.task_id,
        provider_task_id: submission.externalTaskId,
        estimated_credits_millis: creditsMillis,
      });
      if (recordError || !recorded) throw recordError ?? new Error("pilot_submission_not_recorded");
      return response({ orderId: order.id, taskId: reservedData.task_id, status: "submitted", submitted: true }, 200);
    } catch (error) {
      const acceptanceUnknown = error instanceof KieSubmissionUnknownError;
      const failureCode = error instanceof KieApiError
        ? `provider_http_${error.status}`
        : acceptanceUnknown ? "submission_unknown" : "submission_failed";
      await admin.rpc("record_generation_submission_failure", {
        target_task_id: reservedData.task_id,
        failure_code: failureCode,
        acceptance_unknown: acceptanceUnknown,
      });
      return response({
        orderId: order.id,
        taskId: reservedData.task_id,
        status: acceptanceUnknown ? "reconciling" : "failed",
        submitted: acceptanceUnknown,
      }, acceptanceUnknown ? 202 : 502);
    }
  } catch {
    return response({ error: "pilot_unavailable", stage }, 503);
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return response({ error: "not_found" }, 404);
  const admin = createSupabaseAdminClient();

  try {
    if (new URL(request.url).searchParams.get("diagnose") === "audio") {
      return response(await diagnosePilotAudio(admin), 200);
    }
    const { data: order } = await admin
      .from("orders")
      .select("id, status, preview_expires_at")
      .eq("client_request_id", PILOT_REQUEST_ID)
      .maybeSingle();
    if (!order) {
      const [apiKey, webhookHmacKey, settings] = await Promise.all([
        getKieApiKey(admin),
        getKieWebhookHmacKey(admin),
        getApplicationSettings(admin),
      ]);
      let liveConfigValid = false;
      let budgetValid = false;
      try {
        requireKieLiveConfig("live", apiKey);
        liveConfigValid = true;
      } catch {}
      try {
        requireGenerationBudgetConfig("live");
        budgetValid = true;
      } catch {}
      return response({
        state: "not_started",
        readiness: {
          apiKeyConfigured: Boolean(apiKey),
          webhookHmacConfigured: Boolean(webhookHmacKey),
          liveConfigValid,
          budgetValid,
          musicMode: settings.musicMode,
          musicModel: settings.musicModel,
          pilotOnlyMode: process.env.PILOT_ONLY_MODE?.trim() === "true",
          triggerEnabled: process.env.PILOT_TRIGGER_ENABLED?.trim() === "true",
        },
      }, 200);
    }

    let { data: task } = await admin
      .from("generation_tasks")
      .select("id, external_task_id, status, error_code, model, accepted_at, completed_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let providerStatus: string | null = null;
    if (task?.external_task_id && !["succeeded", "failed"].includes(task.status)) {
      const apiKey = await getKieApiKey(admin);
      if (apiKey) {
        try {
          const providerTask = await new KieMusicClient(apiKey).getTask(task.external_task_id);
          providerStatus = providerTask.providerStatus;
          if (providerTask.state === "succeeded" && providerTask.tracks.length > 0) {
            await admin.rpc("apply_generation_callback", {
              provider_task_id: task.external_task_id,
              callback_type: "complete",
              response_code: 200,
              callback_error_code: null,
              callback_tracks: providerTask.tracks.map((track) => ({
                id: track.id,
                audio_url: track.audioUrl,
                stream_audio_url: track.streamAudioUrl,
                title: track.title,
                duration: track.durationSeconds,
                model_name: track.modelName,
              })),
            });
          }
        } catch {
          providerStatus = "LOOKUP_UNAVAILABLE";
        }
      }
    }

    if (hasKieAllowedAudioHostsConfigured()) {
      await processGenerationOutputBatch(4);
    }

    ({ data: task } = await admin
      .from("generation_tasks")
      .select("id, external_task_id, status, error_code, model, accepted_at, completed_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle());
    const { data: outputs } = task ? await admin
      .from("generation_outputs")
      .select("storage_status, storage_attempts, last_error_code, source_audio_url")
      .eq("generation_task_id", task.id) : { data: [] };
    const { data: versions } = await admin
      .from("music_versions")
      .select("status, duration_seconds, full_audio_object_key, preview_object_key")
      .eq("order_id", order.id);

    const audioHosts = [...new Set((outputs ?? []).flatMap((output) => {
      try {
        return output.source_audio_url ? [new URL(output.source_audio_url).hostname.toLowerCase()] : [];
      } catch {
        return [];
      }
    }))];
    const readyVersions = (versions ?? []).filter((version) =>
      version.status === "ready" && version.full_audio_object_key && version.preview_object_key
    ).length;

    return response({
      orderId: order.id,
      orderStatus: order.status,
      taskStatus: task?.status ?? null,
      taskError: task?.error_code ?? null,
      providerStatus,
      outputs: (outputs ?? []).map((output) => ({
        status: output.storage_status,
        attempts: output.storage_attempts,
        error: output.last_error_code,
      })),
      audioHosts,
      readyVersions,
      previewReady: readyVersions > 0,
      previewExpiresAt: order.preview_expires_at,
    }, 200);
  } catch {
    return response({ error: "pilot_status_unavailable" }, 503);
  }
}

export async function PUT(request: Request) {
  if (!authorized(request)) return response({ error: "not_found" }, 404);
  const admin = createSupabaseAdminClient();

  try {
    const { data: order } = await admin
      .from("orders")
      .select("id, owner_id")
      .eq("client_request_id", PILOT_REQUEST_ID)
      .maybeSingle();
    if (!order) return response({ error: "pilot_order_missing" }, 409);
    const { data: task } = await admin
      .from("generation_tasks")
      .select("id, status")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!task || task.status !== "succeeded") {
      return response({ error: "pilot_task_not_succeeded" }, 409);
    }
    const { data: outputs, error } = await admin
      .from("generation_outputs")
      .select("id, version_id, storage_status, storage_attempts")
      .eq("generation_task_id", task.id)
      .order("created_at");
    if (error || !outputs?.length) return response({ error: "pilot_outputs_missing" }, 409);

    const bucket = createSupabaseAudioBucket(admin);
    const results = [];
    for (const output of outputs) {
      if (output.storage_status === "stored") {
        results.push({ status: "stored" });
        continue;
      }
      if (!["failed", "processing"].includes(output.storage_status) || output.storage_attempts >= 3) {
        results.push({ status: "not_recoverable" });
        continue;
      }

      const fullObjectKey = `orders/${order.id}/versions/${output.version_id}/full.mp3`;
      const previewObjectKey = `orders/${order.id}/versions/${output.version_id}/preview.mp3`;
      const [fullObject, previewObject] = await Promise.all([
        bucket.get(fullObjectKey),
        bucket.get(previewObjectKey),
      ]);
      if (!fullObject || !previewObject || fullObject.size === 0 || previewObject.size === 0) {
        results.push({ status: "objects_missing" });
        continue;
      }

      if (output.storage_status === "failed") {
        const { data: claimed, error: claimError } = await admin
          .from("generation_outputs")
          .update({
            storage_status: "processing",
            storage_claimed_at: new Date().toISOString(),
            last_error_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", output.id)
          .eq("storage_status", "failed")
          .lt("storage_attempts", 3)
          .select("id")
          .maybeSingle();
        if (claimError || !claimed) {
          results.push({ status: "claim_failed", code: claimError?.code ?? null });
          continue;
        }
      }

      const { data: published, error: publishError } = await admin.rpc("publish_generation_output", {
        target_output_id: output.id,
        full_object_key: fullObjectKey,
        preview_object_key: previewObjectKey,
      });
      results.push({
        status: !publishError && published ? "stored" : "publish_failed",
        code: publishError?.code ?? null,
      });
    }

    const stored = results.filter((result) => result.status === "stored").length;
    if (stored > 0) {
      await admin.from("admin_audit_log").insert({
        actor_id: order.owner_id,
        action: "recover_single_music_pilot_storage",
        target_type: "order",
        target_id: order.id,
        reason: "Publicar objetos do piloto validados sem nova geração ou nova tentativa externa",
        metadata: { storedOutputs: stored, generatedAgain: false },
      });
    }
    return response({ recovered: stored, results }, stored === outputs.length ? 200 : 503);
  } catch {
    return response({ error: "pilot_recovery_unavailable" }, 503);
  }
}

async function diagnosePilotAudio(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: order } = await admin
    .from("orders")
    .select("id")
    .eq("client_request_id", PILOT_REQUEST_ID)
    .maybeSingle();
  if (!order) return { diagnostic: "order_missing" };

  const { data: task } = await admin
    .from("generation_tasks")
    .select("id")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!task) return { diagnostic: "task_missing" };

  const { data: outputs, error } = await admin
    .from("generation_outputs")
    .select("version_id, provider_audio_id, source_audio_url")
    .eq("generation_task_id", task.id)
    .order("created_at");
  if (error || !outputs?.length) return { diagnostic: "outputs_missing" };

  const bucket = createSupabaseAudioBucket(admin);
  const results = [];
  for (const output of outputs) {
    let source: URL;
    try {
      source = new URL(output.source_audio_url);
    } catch {
      results.push({ stage: "source", status: "failed", code: "invalid_url" });
      continue;
    }
    if (source.protocol !== "https:" || source.hostname.toLowerCase() !== PILOT_AUDIO_HOST) {
      results.push({ stage: "source", status: "failed", code: "unexpected_host" });
      continue;
    }

    let full;
    try {
      full = await copyFullAudioToPrivateStorage({
        bucket,
        sourceUrl: output.source_audio_url,
        allowedSourceHosts: new Set([PILOT_AUDIO_HOST]),
        orderId: order.id,
        versionId: output.version_id,
        providerAudioId: output.provider_audio_id,
      });
    } catch (caught) {
      results.push({ stage: "copy", status: "failed", code: diagnosticErrorCode(caught) });
      continue;
    }

    try {
      const preview = await createAndStoreMp3Preview({
        bucket,
        orderId: order.id,
        versionId: output.version_id,
        fullAudioObjectKey: full.objectKey,
      });
      results.push({
        stage: "complete",
        status: "ok",
        fullBytes: full.size,
        previewBytes: preview.size,
        previewSeconds: Number(preview.durationSeconds.toFixed(3)),
      });
    } catch (caught) {
      results.push({ stage: "preview", status: "failed", code: diagnosticErrorCode(caught) });
    }
  }

  return { diagnostic: "audio_pipeline", results };
}

function diagnosticErrorCode(error: unknown) {
  if (error instanceof AudioStorageError || error instanceof Mp3PreviewError) return error.code;
  if (error instanceof Error && error.message.startsWith("Falha no Storage Supabase:")) {
    return "storage_backend_failed";
  }
  return "unexpected_failure";
}

function authorized(request: Request) {
  const expected = process.env.PILOT_TRIGGER_SECRET?.trim() ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (expected.length < 32) return false;
  const encoder = new TextEncoder();
  const left = encoder.encode(provided);
  const right = encoder.encode(expected);
  let difference = left.length ^ right.length;
  for (let index = 0; index < right.length; index += 1) {
    difference |= right[index] ^ (left[index] ?? 0);
  }
  return difference === 0;
}

function isPilotOrder(value: unknown): value is PilotOrder {
  if (!value || typeof value !== "object") return false;
  const pilot = value as Record<string, unknown>;
  return typeof pilot.order_id === "string" && typeof pilot.approved_lyric_id === "string";
}

function isReservedTask(value: unknown): value is ReservedTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return typeof task.task_id === "string" && typeof task.status === "string";
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}
