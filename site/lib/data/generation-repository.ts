import type { ProviderTrack } from "../music/kie-client";
import {
  ATTACH_FULL_AUDIO_OBJECT_SQL,
  INSERT_MUSIC_VERSION_FROM_TASK_SQL,
  MARK_GENERATION_OUTPUT_FAILED_SQL,
  MARK_GENERATION_OUTPUT_STORED_SQL,
  MARK_GENERATION_TASK_SUCCEEDED_SQL,
  MARK_ORDER_PREVIEW_READY_SQL,
  MARK_VERSION_PREVIEW_READY_SQL,
  PENDING_GENERATION_OUTPUTS_SQL,
  UPSERT_GENERATION_OUTPUT_SQL,
} from "./generation-queries";

export type PersistedTrackInput = ProviderTrack & {
  versionId: string;
  outputId: string;
};

export type PendingGenerationOutput = {
  id: string;
  versionId: string;
  orderId: string;
  providerAudioId: string;
  sourceAudioUrl: string;
  storageAttempts: number;
};

export async function persistProviderTracks(
  db: D1Database,
  taskId: string,
  origin: "original" | "adjustment",
  tracks: PersistedTrackInput[],
) {
  if (tracks.length === 0) return false;

  const statements: D1PreparedStatement[] = [];
  for (const track of tracks) {
    statements.push(
      db.prepare(INSERT_MUSIC_VERSION_FROM_TASK_SQL).bind(
        track.versionId,
        taskId,
        track.title,
        track.durationSeconds,
        track.id,
        origin,
      ),
      db.prepare(UPSERT_GENERATION_OUTPUT_SQL).bind(
        track.outputId,
        taskId,
        track.id,
        track.audioUrl,
      ),
    );
  }
  statements.push(db.prepare(MARK_GENERATION_TASK_SUCCEEDED_SQL).bind(taskId));

  try {
    const results = await db.batch(statements);
    return results.at(-1)?.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function listPendingGenerationOutputs(
  db: D1Database,
  options: { maxAttempts?: number; limit?: number } = {},
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const limit = Math.min(options.limit ?? 10, 50);
  const result = await db
    .prepare(PENDING_GENERATION_OUTPUTS_SQL)
    .bind(maxAttempts, limit)
    .all<PendingGenerationOutput>();
  return result.results;
}

export async function markGenerationOutputStored(
  db: D1Database,
  outputId: string,
  objectKey: string,
) {
  try {
    const [output, version] = await db.batch([
      db.prepare(MARK_GENERATION_OUTPUT_STORED_SQL).bind(outputId),
      db.prepare(ATTACH_FULL_AUDIO_OBJECT_SQL).bind(outputId, objectKey),
    ]);
    return output.meta.changes === 1 && version.meta.changes === 1;
  } catch {
    return false;
  }
}

export async function markGenerationOutputFailed(
  db: D1Database,
  outputId: string,
  errorCode: string,
) {
  const result = await db
    .prepare(MARK_GENERATION_OUTPUT_FAILED_SQL)
    .bind(outputId, errorCode.slice(0, 80))
    .run();
  return result.meta.changes === 1;
}

export async function markPreviewStored(
  db: D1Database,
  versionId: string,
  previewObjectKey: string,
) {
  try {
    const [version, order] = await db.batch([
      db.prepare(MARK_VERSION_PREVIEW_READY_SQL).bind(
        versionId,
        previewObjectKey,
      ),
      db.prepare(MARK_ORDER_PREVIEW_READY_SQL).bind(versionId),
    ]);
    return version.meta.changes === 1 && order.meta.changes === 1;
  } catch {
    return false;
  }
}
