import { markPreviewStored } from "../data/generation-repository";
import { createAndStoreMp3Preview } from "./mp3-preview";
import type { AudioBucket } from "./storage-port";

export async function createPreviewAndPublish(input: {
  db: D1Database;
  bucket: AudioBucket;
  orderId: string;
  versionId: string;
  fullAudioObjectKey: string;
}) {
  const preview = await createAndStoreMp3Preview({
    bucket: input.bucket,
    orderId: input.orderId,
    versionId: input.versionId,
    fullAudioObjectKey: input.fullAudioObjectKey,
  });
  const published = await markPreviewStored(
    input.db,
    input.versionId,
    preview.previewObjectKey,
  );
  if (!published) {
    throw new Error("A prévia foi armazenada, mas ainda não pôde ser publicada.");
  }
  return preview;
}
