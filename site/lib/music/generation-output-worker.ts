import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAudioBucket } from "@/lib/supabase/audio-bucket";
import { AudioStorageError, copyFullAudioToPrivateStorage } from "./audio-storage";
import { requireKieAllowedAudioHosts } from "./kie-env";
import { createAndStoreMp3Preview, Mp3PreviewError } from "./mp3-preview";

type ClaimedOutput = {
  output_id: string;
  version_id: string;
  order_id: string;
  provider_audio_id: string;
  source_audio_url: string;
};

export async function processNextGenerationOutput() {
  const allowedSourceHosts = requireKieAllowedAudioHosts();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_generation_output", {
    max_attempts: 3,
  });
  if (error) throw error;
  if (data === null) return { status: "idle" as const };
  if (!isClaimedOutput(data)) throw new Error("invalid_claimed_output");

  const bucket = createSupabaseAudioBucket(admin);
  try {
    const full = await copyFullAudioToPrivateStorage({
      bucket,
      sourceUrl: data.source_audio_url,
      allowedSourceHosts,
      orderId: data.order_id,
      versionId: data.version_id,
      providerAudioId: data.provider_audio_id,
    });
    const preview = await createAndStoreMp3Preview({
      bucket,
      orderId: data.order_id,
      versionId: data.version_id,
      fullAudioObjectKey: full.objectKey,
    });
    const { data: published, error: publishError } = await admin.rpc(
      "publish_generation_output",
      {
        target_output_id: data.output_id,
        full_object_key: full.objectKey,
        preview_object_key: preview.previewObjectKey,
      },
    );
    if (publishError || !published) {
      throw publishError ?? new Error("output_not_published");
    }
    return {
      status: "processed" as const,
      outputId: data.output_id,
      previewSeconds: preview.durationSeconds,
    };
  } catch (error) {
    const code = workerErrorCode(error);
    await admin.rpc("record_generation_output_failure", {
      target_output_id: data.output_id,
      failure_code: code,
    });
    return { status: "failed" as const, outputId: data.output_id, code };
  }
}

function isClaimedOutput(value: unknown): value is ClaimedOutput {
  if (!value || typeof value !== "object") return false;
  const output = value as Record<string, unknown>;
  return [
    "output_id",
    "version_id",
    "order_id",
    "provider_audio_id",
    "source_audio_url",
  ].every((field) => typeof output[field] === "string" && output[field]);
}

function workerErrorCode(error: unknown) {
  if (error instanceof AudioStorageError || error instanceof Mp3PreviewError) {
    return error.code.slice(0, 80);
  }
  return "output_processing_failed";
}
