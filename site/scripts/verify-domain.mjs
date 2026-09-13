import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  FULL_AUDIO_FOR_OWNER_SQL,
  INSERT_PAYMENT_EVENT_SQL,
  ORDER_FOR_OWNER_SQL,
  PREVIEW_FOR_OWNER_SQL,
  RESERVE_ADJUSTMENT_INSERT_SQL,
  RESERVE_ADJUSTMENT_UPDATE_SQL,
  SELECT_VERSION_FOR_OWNER_SQL,
} from "../lib/data/queries.ts";

const root = resolve(import.meta.dirname, "..");
const migrationDirectory = resolve(root, "drizzle");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

assert.ok(migrationFiles.length > 0, "Nenhuma migração SQL foi gerada.");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");

for (const file of migrationFiles) {
  db.exec(readFileSync(resolve(migrationDirectory, file), "utf8"));
}

db.exec(`
  INSERT INTO accounts (id, auth_subject, email_normalized) VALUES
    ('account-alice', 'auth-alice', 'alice@example.com'),
    ('account-bob', 'auth-bob', 'bob@example.com');

  INSERT INTO orders (
    id, owner_id, status, occasion, recipient_name, story, style,
    adjustment_status, preview_expires_at
  ) VALUES
    ('order-alice', 'account-alice', 'preview_ready', 'Aniversário', 'Ana', 'História A', 'MPB', 'available', '2099-01-01T00:00:00Z'),
    ('order-bob', 'account-bob', 'preview_ready', 'Casamento', 'Beto', 'História B', 'Pop', 'available', '2099-01-01T00:00:00Z');

  INSERT INTO lyrics (id, order_id, kind, revision, content) VALUES
    ('lyric-alice', 'order-alice', 'approved', 1, 'Letra A'),
    ('lyric-bob', 'order-bob', 'approved', 1, 'Letra B');

  INSERT INTO music_versions (
    id, order_id, approved_lyric_id, origin, status,
    full_audio_object_key, preview_object_key
  ) VALUES
    ('version-alice', 'order-alice', 'lyric-alice', 'original', 'ready', 'private/alice.mp3', 'previews/alice.mp3'),
    ('version-bob', 'order-bob', 'lyric-bob', 'original', 'ready', 'private/bob.mp3', 'previews/bob.mp3');
`);

const ownOrder = db.prepare(ORDER_FOR_OWNER_SQL);
assert.equal(ownOrder.get("order-alice", "account-alice").id, "order-alice");
assert.equal(ownOrder.get("order-bob", "account-alice"), undefined);

const selectVersion = db.prepare(SELECT_VERSION_FOR_OWNER_SQL);
assert.equal(
  selectVersion.run("order-alice", "account-alice", "version-bob").changes,
  0,
);
assert.equal(
  selectVersion.run("order-alice", "account-alice", "version-alice").changes,
  1,
);

const preview = db.prepare(PREVIEW_FOR_OWNER_SQL);
assert.equal(
  preview.get("order-alice", "account-alice", "version-alice").objectKey,
  "previews/alice.mp3",
);
assert.equal(
  preview.get("order-bob", "account-alice", "version-bob"),
  undefined,
);

const fullAudio = db.prepare(FULL_AUDIO_FOR_OWNER_SQL);
assert.equal(fullAudio.get("order-alice", "account-alice"), undefined);

db.exec(`
  UPDATE orders SET status = 'paid' WHERE id = 'order-alice';
  INSERT INTO deliveries (
    id, order_id, version_id, full_audio_object_key, share_token_hash
  ) VALUES (
    'delivery-alice', 'order-alice', 'version-alice', 'private/alice.mp3', 'hash-alice'
  );
`);

assert.equal(
  fullAudio.get("order-alice", "account-alice").objectKey,
  "private/alice.mp3",
);
assert.equal(fullAudio.get("order-alice", "account-bob"), undefined);

const reserveUpdate = db.prepare(RESERVE_ADJUSTMENT_UPDATE_SQL);
const reserveInsert = db.prepare(RESERVE_ADJUSTMENT_INSERT_SQL);

function reserveAdjustment(requestId) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const update = reserveUpdate.run(
      "order-alice",
      "account-alice",
      requestId,
      "version-alice",
    );
    const insert = reserveInsert.run(
      "order-alice",
      "account-alice",
      requestId,
      "version-alice",
      "Mais suave no refrão",
    );

    assert.equal(update.changes, 1);
    assert.equal(insert.changes, 1);
    db.exec("COMMIT");
    return true;
  } catch {
    db.exec("ROLLBACK");
    return false;
  }
}

assert.equal(reserveAdjustment("adjustment-1"), true);
assert.equal(reserveAdjustment("adjustment-2"), false);
assert.equal(
  db.prepare("SELECT count(*) AS total FROM adjustment_requests WHERE order_id = ?").get("order-alice").total,
  1,
);

db.exec(`
  INSERT INTO payment_intents (
    id, order_id, version_id, provider, external_payment_id, amount_cents, status
  ) VALUES (
    'payment-alice', 'order-alice', 'version-alice', 'test-provider', 'pay-1', 1990, 'confirmed'
  );
`);

const paymentEvent = db.prepare(INSERT_PAYMENT_EVENT_SQL);
assert.equal(
  paymentEvent.run(
    "event-1",
    "payment-alice",
    "test-provider",
    "provider-event-1",
    "payment.confirmed",
    "hash-1",
    "2026-09-10T12:00:00Z",
  ).changes,
  1,
);
assert.equal(
  paymentEvent.run(
    "event-duplicate",
    "payment-alice",
    "test-provider",
    "provider-event-1",
    "payment.confirmed",
    "hash-1",
    "2026-09-10T12:00:00Z",
  ).changes,
  0,
);

db.exec(`
  INSERT INTO generation_tasks (
    id, order_id, request_key, provider, model
  ) VALUES ('task-1', 'order-alice', 'generate:order-alice:1', 'kie.ai', 'suno-v4');
`);
assert.throws(() => {
  db.exec(`
    INSERT INTO generation_tasks (
      id, order_id, request_key, provider, model
    ) VALUES ('task-2', 'order-alice', 'generate:order-alice:1', 'kie.ai', 'suno-v4');
  `);
});

db.exec("PRAGMA optimize");
db.close();

console.log("PASS: pedidos e prévias isolados por proprietário");
console.log("PASS: áudio completo liberado apenas após pagamento e para a versão escolhida");
console.log("PASS: ajuste único reservado atomicamente");
console.log("PASS: eventos de pagamento e tarefas de geração idempotentes");
