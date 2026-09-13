import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  APPROVE_LATEST_PROPOSED_LYRIC_SQL,
  CREATE_DRAFT_ORDER_SQL,
  CREATE_SOURCE_LYRIC_SQL,
  INSERT_BRIEFING_REVISION_SQL,
  INSERT_PROPOSED_LYRIC_SQL,
  LATEST_LYRICS_FOR_OWNER_SQL,
  MARK_LYRICS_APPROVED_SQL,
  MARK_LYRICS_REVIEW_SQL,
  UPDATE_BRIEFING_FOR_OWNER_SQL,
} from "../lib/data/lyrics-queries.ts";

const root = resolve(import.meta.dirname, "..");
const migrationDirectory = resolve(root, "drizzle");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

assert.ok(migrationFiles.length >= 2, "A migração do estado de aprovação não foi gerada.");

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON");
for (const file of migrationFiles) {
  db.exec(readFileSync(resolve(migrationDirectory, file), "utf8"));
}

db.exec(`
  INSERT INTO accounts (id, auth_subject, email_normalized) VALUES
    ('account-alice', 'auth-alice', 'alice@example.com'),
    ('account-bob', 'auth-bob', 'bob@example.com');
`);

const story1 = "Foi numa tarde de verão que tudo começou. " + "Um detalhe querido da história. ".repeat(7);
const story2 = "A pronúncia e os fatos foram revisados antes da música. " + "Outro detalhe importante. ".repeat(7);
assert.ok(story1.length >= 200 && story1.length <= 4_000);
assert.ok(story2.length >= 200 && story2.length <= 4_000);

const createOrder = db.prepare(CREATE_DRAFT_ORDER_SQL);
const createSource = db.prepare(CREATE_SOURCE_LYRIC_SQL);
db.exec("BEGIN IMMEDIATE");
assert.equal(
  createOrder.run("order-alice", "account-alice", "Aniversário", "Ana", "A-na", story1, "MPB").changes,
  1,
);
assert.equal(
  createSource.run("source-1", "order-alice", "account-alice", story1).changes,
  1,
);
db.exec("COMMIT");

const insertProposed = db.prepare(INSERT_PROPOSED_LYRIC_SQL);
const markReview = db.prepare(MARK_LYRICS_REVIEW_SQL);

function saveProposal(ownerId, lyricId, content) {
  db.exec("BEGIN IMMEDIATE");
  const lyric = insertProposed.run(lyricId, "order-alice", ownerId, content);
  const status = markReview.run("order-alice", ownerId, lyricId);
  if (lyric.changes === 1 && status.changes === 1) {
    db.exec("COMMIT");
    return true;
  }
  db.exec("ROLLBACK");
  return false;
}

assert.equal(saveProposal("account-bob", "proposal-attack", "Não pertence a Bob"), false);
assert.equal(saveProposal("account-alice", "proposal-1", "Primeira letra proposta"), true);
assert.equal(saveProposal("account-alice", "proposal-2", "Segunda letra proposta"), true);

const approve = db.prepare(APPROVE_LATEST_PROPOSED_LYRIC_SQL);
const markApproved = db.prepare(MARK_LYRICS_APPROVED_SQL);

function approveProposal(ownerId, proposedLyricId, approvedLyricId) {
  db.exec("BEGIN IMMEDIATE");
  const lyric = approve.run(approvedLyricId, "order-alice", ownerId, proposedLyricId);
  const status = markApproved.run("order-alice", ownerId, approvedLyricId);
  if (lyric.changes === 1 && status.changes === 1) {
    db.exec("COMMIT");
    return true;
  }
  db.exec("ROLLBACK");
  return false;
}

assert.equal(approveProposal("account-alice", "proposal-1", "approved-stale"), false);
assert.equal(approveProposal("account-bob", "proposal-2", "approved-attack"), false);
assert.equal(approveProposal("account-alice", "proposal-2", "approved-1"), true);
assert.equal(
  db.prepare("SELECT status FROM orders WHERE id = ?").get("order-alice").status,
  "lyrics_approved",
);
assert.equal(
  db.prepare("SELECT content FROM lyrics WHERE id = ?").get("approved-1").content,
  "Segunda letra proposta",
);

const insertRevision = db.prepare(INSERT_BRIEFING_REVISION_SQL);
const updateBriefing = db.prepare(UPDATE_BRIEFING_FOR_OWNER_SQL);
db.exec("BEGIN IMMEDIATE");
assert.equal(
  insertRevision.run("source-2", "order-alice", "account-alice", story2).changes,
  1,
);
assert.equal(
  updateBriefing.run(
    "order-alice",
    "account-alice",
    "Aniversário",
    "Ana Clara",
    "A-na Clá-ra",
    story2,
    "Acústico",
    "source-2",
  ).changes,
  1,
);
db.exec("COMMIT");

assert.equal(
  db.prepare("SELECT status FROM orders WHERE id = ?").get("order-alice").status,
  "draft",
);
assert.deepEqual(
  db.prepare("SELECT revision, content FROM lyrics WHERE order_id = ? AND kind = 'source' ORDER BY revision")
    .all("order-alice")
    .map(({ revision, content }) => ({ revision, content })),
  [
    { revision: 1, content: story1 },
    { revision: 2, content: story2 },
  ],
);
assert.equal(
  db.prepare("SELECT content FROM lyrics WHERE id = ?").get("approved-1").content,
  "Segunda letra proposta",
);

const latestLyrics = db.prepare(LATEST_LYRICS_FOR_OWNER_SQL);
assert.equal(latestLyrics.all("order-alice", "account-bob").length, 0);
assert.deepEqual(
  latestLyrics.all("order-alice", "account-alice").map(({ kind, revision }) => ({ kind, revision })),
  [
    { kind: "source", revision: 2 },
    { kind: "proposed", revision: 2 },
    { kind: "approved", revision: 1 },
  ],
);

assert.equal(db.prepare("SELECT count(*) AS total FROM generation_tasks").get().total, 0);
assert.equal(db.prepare("SELECT count(*) AS total FROM music_versions").get().total, 0);

db.exec("PRAGMA optimize");
db.close();

console.log("PASS: briefing original e revisões permanecem separados");
console.log("PASS: somente a proposta mais recente pode ser aprovada pelo proprietário");
console.log("PASS: editar o briefing invalida a aprovação sem apagar o histórico");
console.log("PASS: salvar e aprovar letras não inicia geração musical");
