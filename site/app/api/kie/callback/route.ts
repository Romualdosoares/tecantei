import { after, NextResponse } from "next/server";
import { getKieWebhookHmacKey } from "@/lib/admin/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processGenerationOutputBatch } from "@/lib/music/generation-output-worker";
import { parseKieGenerationCallback } from "@/lib/music/kie-callback";
import { hasKieAllowedAudioHostsConfigured } from "@/lib/music/kie-env";
import { verifyKieWebhook } from "@/lib/music/kie-webhook";

const MAX_CALLBACK_BYTES = 128 * 1_024;
const NO_STORE = { "Cache-Control": "no-store" };
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_CALLBACK_BYTES) {
      return response({ error: "payload_too_large" }, 413);
    }

    let value: unknown;
    try {
      value = JSON.parse(rawBody);
    } catch {
      return response({ error: "invalid_payload" }, 400);
    }
    const parsed = parseKieGenerationCallback(value);
    if (!parsed.success) {
      return response({ error: "invalid_payload" }, 400);
    }

    const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
    const signature = request.headers.get("x-webhook-signature") ?? "";
    const admin = createSupabaseAdminClient();
    const hmacKey = await getKieWebhookHmacKey(admin);
    if (!hmacKey) return response({ error: "webhook_not_configured" }, 503);
    const verified = await verifyKieWebhook({
      taskId: parsed.data.data.task_id,
      timestamp,
      signature,
      hmacKey,
    });
    if (!verified) return response({ error: "invalid_signature" }, 401);

    const callback = parsed.data;
    const { data, error } = await admin.rpc("apply_generation_callback", {
      provider_task_id: callback.data.task_id,
      callback_type: callback.data.callbackType,
      response_code: callback.code,
      callback_error_code: callback.code === 200 && callback.data.callbackType !== "error"
        ? null
        : `provider_callback_${callback.code}`,
      callback_tracks: callback.data.data,
    });
    if (error || !isCallbackResult(data) || !data.found) {
      return response({ error: "callback_not_applied" }, 503);
    }

    if (callback.data.callbackType === "complete" && hasKieAllowedAudioHostsConfigured()) {
      after(async () => {
        try {
          await processGenerationOutputBatch(4);
        } catch {
          // A rotina diária protegida por CRON_SECRET recupera saídas pendentes.
        }
      });
    }

    return response({ ok: true, status: data.status }, 200);
  } catch {
    return response({ error: "callback_unavailable" }, 503);
  }
}

function isCallbackResult(value: unknown): value is {
  found: boolean;
  status: string;
} {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result.found === "boolean" && typeof result.status === "string";
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}
