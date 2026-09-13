import type { AudioBucket } from "./storage-port";

const MAX_PREVIEW_SECONDS = 50;
const MIN_SOURCE_SECONDS = 150;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

const MPEG1_LAYER3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG2_LAYER3_BITRATES = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];

export class Mp3PreviewError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Falha ao criar prévia MP3: ${code}`);
    this.name = "Mp3PreviewError";
    this.code = code;
  }
}

export function extractMp3Preview(source: Uint8Array) {
  if (source.length === 0 || source.length > MAX_AUDIO_BYTES) {
    throw new Mp3PreviewError("invalid_source_size");
  }

  const firstFrameOffset = findFirstFrame(source);
  if (firstFrameOffset < 0) throw new Mp3PreviewError("frames_not_found");

  const frames: Array<{ offset: number; length: number; seconds: number }> = [];
  let offset = firstFrameOffset;
  let sourceDurationSeconds = 0;

  while (offset + 4 <= source.length) {
    const frame = parseFrame(source, offset);
    if (!frame || offset + frame.length > source.length) break;
    frames.push({ offset, ...frame });
    sourceDurationSeconds += frame.seconds;
    offset += frame.length;
  }

  if (sourceDurationSeconds + 0.001 < MIN_SOURCE_SECONDS) {
    throw new Mp3PreviewError("source_too_short");
  }

  let previewEnd = firstFrameOffset;
  let previewDurationSeconds = 0;
  for (const frame of frames) {
    if (previewDurationSeconds + frame.seconds > MAX_PREVIEW_SECONDS) break;
    previewDurationSeconds += frame.seconds;
    previewEnd = frame.offset + frame.length;
  }

  if (previewEnd === firstFrameOffset) {
    throw new Mp3PreviewError("preview_empty");
  }

  return {
    bytes: source.slice(firstFrameOffset, previewEnd),
    durationSeconds: previewDurationSeconds,
    sourceDurationSeconds,
  };
}

export async function createAndStoreMp3Preview(input: {
  bucket: AudioBucket;
  orderId: string;
  versionId: string;
  fullAudioObjectKey: string;
}) {
  assertSafeId(input.orderId);
  assertSafeId(input.versionId);

  const expectedFullKey = `orders/${input.orderId}/versions/${input.versionId}/full.mp3`;
  if (input.fullAudioObjectKey !== expectedFullKey) {
    throw new Mp3PreviewError("unexpected_full_audio_key");
  }

  const sourceObject = await input.bucket.get(expectedFullKey);
  if (!sourceObject) throw new Mp3PreviewError("full_audio_not_found");
  if (sourceObject.size > MAX_AUDIO_BYTES) {
    throw new Mp3PreviewError("invalid_source_size");
  }

  const preview = extractMp3Preview(
    new Uint8Array(await sourceObject.arrayBuffer()),
  );
  const previewObjectKey = `orders/${input.orderId}/versions/${input.versionId}/preview.mp3`;
  await input.bucket.put(previewObjectKey, preview.bytes, {
    httpMetadata: { contentType: "audio/mpeg" },
    customMetadata: {
      durationSeconds: preview.durationSeconds.toFixed(3),
      sourceDurationSeconds: preview.sourceDurationSeconds.toFixed(3),
    },
  });

  return {
    previewObjectKey,
    durationSeconds: preview.durationSeconds,
    sourceDurationSeconds: preview.sourceDurationSeconds,
    size: preview.bytes.length,
  };
}

function findFirstFrame(bytes: Uint8Array) {
  const id3End = readId3End(bytes);
  const scanEnd = Math.min(bytes.length - 4, id3End + 64 * 1024);
  for (let offset = id3End; offset <= scanEnd; offset += 1) {
    const frame = parseFrame(bytes, offset);
    if (!frame) continue;
    const next = parseFrame(bytes, offset + frame.length);
    if (next) return offset;
  }
  return -1;
}

function readId3End(bytes: Uint8Array) {
  if (
    bytes.length < 10 ||
    bytes[0] !== 0x49 ||
    bytes[1] !== 0x44 ||
    bytes[2] !== 0x33
  ) {
    return 0;
  }
  const sizeBytes = bytes.slice(6, 10);
  if (sizeBytes.some((value) => (value & 0x80) !== 0)) return 0;
  const size = (sizeBytes[0] << 21) |
    (sizeBytes[1] << 14) |
    (sizeBytes[2] << 7) |
    sizeBytes[3];
  const footer = (bytes[5] & 0x10) !== 0 ? 10 : 0;
  return Math.min(10 + size + footer, bytes.length);
}

function parseFrame(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length) return null;
  const header = (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
  if (((header & 0xffe00000) >>> 0) !== 0xffe00000) return null;

  const versionBits = (header >>> 19) & 0b11;
  const layerBits = (header >>> 17) & 0b11;
  const bitrateIndex = (header >>> 12) & 0b1111;
  const sampleRateIndex = (header >>> 10) & 0b11;
  const padding = (header >>> 9) & 1;
  if (
    versionBits === 0b01 ||
    layerBits !== 0b01 ||
    bitrateIndex === 0 ||
    bitrateIndex === 0b1111 ||
    sampleRateIndex === 0b11
  ) {
    return null;
  }

  const isMpeg1 = versionBits === 0b11;
  const sampleRateDivisor = isMpeg1 ? 1 : versionBits === 0b10 ? 2 : 4;
  const sampleRate = [44_100, 48_000, 32_000][sampleRateIndex] /
    sampleRateDivisor;
  const bitrate = (isMpeg1
    ? MPEG1_LAYER3_BITRATES
    : MPEG2_LAYER3_BITRATES)[bitrateIndex];
  const samplesPerFrame = isMpeg1 ? 1_152 : 576;
  const coefficient = isMpeg1 ? 144_000 : 72_000;
  const length = Math.floor((coefficient * bitrate) / sampleRate) + padding;
  if (length < 24) return null;

  return { length, seconds: samplesPerFrame / sampleRate };
}

function assertSafeId(value: string) {
  if (!SAFE_ID.test(value)) throw new Mp3PreviewError("invalid_identifier");
}
