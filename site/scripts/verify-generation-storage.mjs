import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ATTACH_FULL_AUDIO_OBJECT_SQL,
  INSERT_MUSIC_VERSION_FROM_TASK_SQL,
  MARK_GENERATION_OUTPUT_STORED_SQL,
  MARK_GENERATION_TASK_SUCCEEDED_SQL,
  PENDING_GENERATION_OUTPUTS_SQL,
  UPSERT_GENERATION_OUTPUT_SQL,
} from "../lib/data/generation-queries.ts";
import { FULL_AUDIO_FOR_OWNER_SQL } from "../lib/data/queries.ts";
import {
  AudioStorageError,
  copyFullAudioToPrivateStorage,
} from "../lib/music/audio-storage.ts";

const root = resolve(import.meta.dirname, "..");
const migrationDirectory = resolve(root, "drizzle");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();
assert.ok(migrationFiles.length >= 3, "A migração das saídas de geração não foi criada.");

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
    'order-1', 'account-1', 'generating', 'Aniversário', 'Ana', 'Uma história privada', 'MPB'
  );
  INSERT INTO lyrics (id, order_id, kind, revision, content)
  VALUES ('approved-1', 'order-1', 'approved', 1, 'Letra aprovada');
  INSERT INTO generation_tasks (
    id, order_id, approved_lyric_id, request_key, provider, model,
    external_task_id, status
  ) VALUES (
    'task-1', 'order-1', 'approved-1', 'generate:order-1:approved-1',
    'kie.ai', 'V6', 'kie-task-1', 'processing'
  );
`);

const insertVersion = db.prepare(INSERT_MUSIC_VERSION_FROM_TASK_SQL);
const upsertOutput = db.prepare(UPSERT_GENERATION_OUTPUT_SQL);
const tracks = [
  { versionId: "version-1", outputId: "output-1", title: "Canção A", duration: 198.4, providerId: "track-1", url: "https://cdn.kie.test/track-1.mp3" },
  { versionId: "version-2", outputId: "output-2", title: "Canção B", duration: 201.2, providerId: "track-2", url: "https://cdn.kie.test/track-2.mp3" },
];

function persistTracks(items) {
  db.exec("BEGIN IMMEDIATE");
  for (const track of items) {
    insertVersion.run(track.versionId, "task-1", track.title, track.duration, track.providerId, "original");
    upsertOutput.run(track.outputId, "task-1", track.providerId, track.url);
  }
  db.exec("COMMIT");
}

persistTracks(tracks);
persistTracks(tracks.map((track, index) => ({
  ...track,
  versionId: `duplicate-version-${index}`,
  outputId: `duplicate-output-${index}`,
})));

assert.equal(db.prepare("SELECT count(*) AS total FROM music_versions").get().total, 2);
assert.equal(db.prepare("SELECT count(*) AS total FROM generation_outputs").get().total, 2);
assert.equal(db.prepare(MARK_GENERATION_TASK_SUCCEEDED_SQL).run("task-1").changes, 1);

const pending = db.prepare(PENDING_GENERATION_OUTPUTS_SQL).all(3, 10);
assert.equal(pending.length, 2);
assert.deepEqual(new Set(pending.map((item) => item.providerAudioId)), new Set(["track-1", "track-2"]));

const writes = [];
const fakeBucket = {
  async put(key, value, options) {
    writes.push({ key, value, options });
    return { key };
  },
};
const mp3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x01]);
const fakeFetch = async () => new Response(mp3, {
  status: 200,
  headers: {
    "Content-Type": "audio/mpeg",
    "Content-Length": String(mp3.length),
  },
});

const stored = await copyFullAudioToPrivateStorage({
  bucket: fakeBucket,
  sourceUrl: pending[0].sourceAudioUrl,
  allowedSourceHosts: new Set(["cdn.kie.test"]),
  orderId: pending[0].orderId,
  versionId: pending[0].versionId,
  providerAudioId: pending[0].providerAudioId,
  fetcher: fakeFetch,
});
assert.equal(stored.objectKey, `orders/order-1/versions/${pending[0].versionId}/full.mp3`);
assert.equal(writes.length, 1);
assert.equal(writes[0].options.httpMetadata.contentType, "audio/mpeg");

db.exec("BEGIN IMMEDIATE");
assert.equal(db.prepare(MARK_GENERATION_OUTPUT_STORED_SQL).run(pending[0].id).changes, 1);
assert.equal(db.prepare(ATTACH_FULL_AUDIO_OBJECT_SQL).run(pending[0].id, stored.objectKey).changes, 1);
db.exec("COMMIT");

const storedRecord = db.prepare(`
  SELECT output.source_audio_url AS sourceUrl,
         output.storage_status AS storageStatus,
         version.full_audio_object_key AS objectKey,
         version.preview_object_key AS previewKey,
         version.status
  FROM generation_outputs AS output
  INNER JOIN music_versions AS version ON version.id = output.version_id
  WHERE output.id = ?
`).get(pending[0].id);
assert.equal(storedRecord.sourceUrl, "");
assert.equal(storedRecord.storageStatus, "stored");
assert.equal(storedRecord.objectKey, stored.objectKey);
assert.equal(storedRecord.previewKey, null);
assert.equal(storedRecord.status, "generating");
assert.equal(db.prepare(FULL_AUDIO_FOR_OWNER_SQL).get("order-1", "account-1"), undefined);

await assert.rejects(
  copyFullAudioToPrivateStorage({
    bucket: fakeBucket,
    sourceUrl: "https://attacker.example/audio.mp3",
    allowedSourceHosts: new Set(["cdn.kie.test"]),
    orderId: "order-1",
    versionId: "version-1",
    providerAudioId: "track-1",
    fetcher: fakeFetch,
  }),
  (error) => error instanceof AudioStorageError && error.code === "source_not_allowed",
);
assert.equal(writes.length, 1);

db.exec("PRAGMA optimize");
db.close();

console.log("PASS: uma tarefa persiste várias faixas sem duplicar retornos repetidos");
console.log("PASS: áudio completo usa chave privada determinística no R2");
console.log("PASS: origem não autorizada e identificadores inseguros são recusados");
console.log("PASS: URL temporária é apagada após a cópia e o áudio continua bloqueado");
