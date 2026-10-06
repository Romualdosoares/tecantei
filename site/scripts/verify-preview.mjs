import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  MARK_ORDER_PREVIEW_READY_SQL,
  MARK_VERSION_PREVIEW_READY_SQL,
} from "../lib/data/generation-queries.ts";
import {
  FULL_AUDIO_FOR_OWNER_SQL,
  PREVIEW_FOR_OWNER_SQL,
} from "../lib/data/queries.ts";
import {
  Mp3PreviewError,
  createAndStoreMp3Preview,
  extractMp3Preview,
} from "../lib/music/mp3-preview.ts";

const frameLength = 417;
const frameCount = 6_000;
const id3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0, 0, 0, 0]);
const frames = new Uint8Array(frameLength * frameCount);
for (let index = 0; index < frameCount; index += 1) {
  const offset = index * frameLength;
  frames.set([0xff, 0xfb, 0x90, 0x00], offset);
}
const source = new Uint8Array(id3.length + frames.length);
source.set(id3);
source.set(frames, id3.length);

const preview = extractMp3Preview(source);
assert.ok(preview.durationSeconds <= 50);
assert.ok(preview.durationSeconds > 49.9);
assert.ok(preview.sourceDurationSeconds >= 150);
assert.equal(preview.bytes.length % frameLength, 0);
assert.deepEqual(Array.from(preview.bytes.slice(0, 4)), [0xff, 0xfb, 0x90, 0x00]);

// Real provider MP3s retain Xing/Info duration and seek data for the full song.
// A preview must advertise only its retained audio frames, not that full duration.
for (const tag of ["Xing", "Info"]) {
  const taggedSource = source.slice();
  const tagOffset = id3.length + 36;
  const view = new DataView(taggedSource.buffer);
  taggedSource.set(new TextEncoder().encode(tag), tagOffset);
  view.setUint32(tagOffset + 4, 15);
  view.setUint32(tagOffset + 8, frameCount - 1);
  view.setUint32(tagOffset + 12, frames.length);
  taggedSource.fill(255, tagOffset + 16, tagOffset + 116);
  taggedSource.set(new TextEncoder().encode("Lavc test"), tagOffset + 120);
  const original = taggedSource.slice();
  const taggedPreview = extractMp3Preview(taggedSource);
  const previewView = new DataView(taggedPreview.bytes.buffer);
  const retainedFrames = taggedPreview.bytes.length / frameLength;
  assert.equal(previewView.getUint32(44), retainedFrames - 1, `${tag} frame count must describe the preview`);
  assert.equal(previewView.getUint32(48), taggedPreview.bytes.length);
  assert.equal(taggedPreview.bytes[52], 0);
  assert.ok(taggedPreview.bytes[151] > 240 && taggedPreview.bytes[151] < 256);
  for (let i = 53; i < 152; i += 1) assert.ok(taggedPreview.bytes[i] >= taggedPreview.bytes[i - 1]);
  assert.deepEqual(taggedPreview.bytes.slice(156, 192), new Uint8Array(36));
  assert.deepEqual(taggedPreview.bytes.slice(frameLength), preview.bytes.slice(frameLength), "audio frames must remain unchanged");
  assert.deepEqual(taggedSource, original, "the full song must remain unchanged");
}

for (const fixture of [
  { header: [0xff, 0xfb, 0x90, 0xc0], tagOffset: 21 }, // MPEG-1 mono
  { header: [0xff, 0xfa, 0x90, 0x00], tagOffset: 36 }, // MPEG-1 stereo with CRC
  { header: [0xff, 0xf3, 0xc0, 0x00], tagOffset: 21 }, // MPEG-2 stereo
  { header: [0xff, 0xf2, 0xc0, 0xc0], tagOffset: 13 }, // MPEG-2 mono with CRC
]) {
  const audio = frames.slice();
  for (let offset = 0; offset < audio.length; offset += frameLength) audio.set(fixture.header, offset);
  audio.set(new TextEncoder().encode("Xing"), fixture.tagOffset);
  const view = new DataView(audio.buffer);
  view.setUint32(fixture.tagOffset + 4, 3);
  view.setUint32(fixture.tagOffset + 8, frameCount - 1);
  view.setUint32(fixture.tagOffset + 12, audio.length);
  const clip = extractMp3Preview(audio);
  const clipView = new DataView(clip.bytes.buffer);
  assert.equal(clipView.getUint32(fixture.tagOffset + 8), clip.bytes.length / frameLength - 1);
  assert.equal(clipView.getUint32(fixture.tagOffset + 12), clip.bytes.length);
  assert.deepEqual(clip.bytes.slice(frameLength), audio.slice(frameLength, clip.bytes.length));
}

const shortSource = source.slice(0, id3.length + frameLength * 1_000);
assert.throws(
  () => extractMp3Preview(shortSource),
  (error) => error instanceof Mp3PreviewError && error.code === "source_too_short",
);
assert.throws(
  () => extractMp3Preview(new Uint8Array([1, 2, 3, 4, 5])),
  (error) => error instanceof Mp3PreviewError && error.code === "frames_not_found",
);

const writes = [];
const fakeBucket = {
  async get(key) {
    assert.equal(key, "orders/order-1/versions/version-1/full.mp3");
    return {
      size: source.length,
      async arrayBuffer() {
        return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      },
    };
  },
  async put(key, value, options) {
    writes.push({ key, value, options });
    return { key };
  },
};

const stored = await createAndStoreMp3Preview({
  bucket: fakeBucket,
  orderId: "order-1",
  versionId: "version-1",
  fullAudioObjectKey: "orders/order-1/versions/version-1/full.mp3",
});
assert.equal(stored.previewObjectKey, "orders/order-1/versions/version-1/preview.mp3");
assert.equal(writes.length, 1);
assert.equal(writes[0].key, stored.previewObjectKey);
assert.equal(writes[0].options.httpMetadata.contentType, "audio/mpeg");
assert.ok(Number(writes[0].options.customMetadata.durationSeconds) <= 50);

await assert.rejects(
  createAndStoreMp3Preview({
    bucket: fakeBucket,
    orderId: "order-1",
    versionId: "version-1",
    fullAudioObjectKey: "orders/order-other/versions/version-1/full.mp3",
  }),
  (error) => error instanceof Mp3PreviewError && error.code === "unexpected_full_audio_key",
);

const root = resolve(import.meta.dirname, "..");
const migrationDirectory = resolve(root, "drizzle");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
for (const file of migrationFiles) {
  db.exec(readFileSync(resolve(migrationDirectory, file), "utf8"));
}
db.exec(`
  INSERT INTO accounts (id, auth_subject, email_normalized)
  VALUES ('account-1', 'auth-1', 'cliente@example.com');
  INSERT INTO orders (
    id, owner_id, status, occasion, recipient_name, story, style
  ) VALUES (
    'order-1', 'account-1', 'generating', 'Aniversário', 'Ana', 'História privada', 'MPB'
  );
  INSERT INTO lyrics (id, order_id, kind, revision, content)
  VALUES ('approved-1', 'order-1', 'approved', 1, 'Letra aprovada');
  INSERT INTO music_versions (
    id, order_id, approved_lyric_id, origin, status, provider_audio_id,
    full_audio_object_key
  ) VALUES (
    'version-1', 'order-1', 'approved-1', 'original', 'generating', 'track-1',
    'orders/order-1/versions/version-1/full.mp3'
  );
`);

assert.equal(
  db.prepare(PREVIEW_FOR_OWNER_SQL).get("order-1", "account-1", "version-1"),
  undefined,
);
db.exec("BEGIN IMMEDIATE");
assert.equal(db.prepare(MARK_VERSION_PREVIEW_READY_SQL).run("version-1", stored.previewObjectKey).changes, 1);
assert.equal(db.prepare(MARK_ORDER_PREVIEW_READY_SQL).run("version-1").changes, 1);
db.exec("COMMIT");

const order = db.prepare(`
  SELECT status, adjustment_status AS adjustmentStatus,
         (julianday(preview_expires_at) - julianday('now')) AS daysUntilExpiry
  FROM orders WHERE id = ?
`).get("order-1");
assert.equal(order.status, "preview_ready");
assert.equal(order.adjustmentStatus, "available");
assert.ok(order.daysUntilExpiry > 13.99 && order.daysUntilExpiry <= 14);
assert.equal(
  db.prepare(PREVIEW_FOR_OWNER_SQL).get("order-1", "account-1", "version-1").objectKey,
  stored.previewObjectKey,
);
assert.equal(
  db.prepare(PREVIEW_FOR_OWNER_SQL).get("order-1", "account-other", "version-1"),
  undefined,
);
assert.equal(db.prepare(FULL_AUDIO_FOR_OWNER_SQL).get("order-1", "account-1"), undefined);

db.exec("PRAGMA optimize");
db.close();

console.log("PASS: prévia MP3 contém somente quadros completos e não ultrapassa 50 segundos");
console.log("PASS: áudio com menos de 2min30 e conteúdo inválido são recusados");
console.log("PASS: prévia usa objeto separado e chave do áudio completo não pode ser trocada");
console.log("PASS: versão só fica pronta após a prévia e expira em 14 dias");
console.log("PASS: proprietário acessa a prévia, mas o áudio completo continua bloqueado");
