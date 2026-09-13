import type { AudioBucketWriter } from "./storage-port";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export class AudioStorageError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Falha ao armazenar áudio: ${code}`);
    this.name = "AudioStorageError";
    this.code = code;
  }
}

export async function copyFullAudioToPrivateStorage(input: {
  bucket: AudioBucketWriter;
  sourceUrl: string;
  allowedSourceHosts: ReadonlySet<string>;
  orderId: string;
  versionId: string;
  providerAudioId: string;
  fetcher?: typeof fetch;
}) {
  assertSafeId(input.orderId);
  assertSafeId(input.versionId);
  assertSafeId(input.providerAudioId);

  const source = new URL(input.sourceUrl);
  if (
    source.protocol !== "https:" ||
    !input.allowedSourceHosts.has(source.hostname.toLowerCase())
  ) {
    throw new AudioStorageError("source_not_allowed");
  }

  const response = await (input.fetcher ?? fetch)(source, {
    method: "GET",
    redirect: "error",
  });
  if (!response.ok) throw new AudioStorageError("source_http_error");

  const declaredLength = Number(response.headers.get("content-length"));
  if (declaredLength > MAX_AUDIO_BYTES) {
    throw new AudioStorageError("audio_too_large");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_AUDIO_BYTES) {
    throw new AudioStorageError("invalid_audio_size");
  }
  if (!looksLikeMp3(bytes)) {
    throw new AudioStorageError("invalid_audio_format");
  }

  const objectKey = `orders/${input.orderId}/versions/${input.versionId}/full.mp3`;
  await input.bucket.put(objectKey, bytes, {
    httpMetadata: { contentType: "audio/mpeg" },
    customMetadata: { providerAudioId: input.providerAudioId },
  });

  return { objectKey, size: bytes.length };
}

function assertSafeId(value: string) {
  if (!SAFE_ID.test(value)) throw new AudioStorageError("invalid_identifier");
}

function looksLikeMp3(bytes: Uint8Array) {
  const hasId3 = bytes.length >= 3 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33;
  const hasFrameSync = bytes.length >= 2 &&
    bytes[0] === 0xff &&
    (bytes[1] & 0xe0) === 0xe0;
  return hasId3 || hasFrameSync;
}
