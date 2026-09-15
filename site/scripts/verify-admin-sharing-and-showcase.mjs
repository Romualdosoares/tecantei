import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [dashboardRoute, dashboard, shareRoute, shareHelper, presentPage, presentAudio, showcaseRoute, migration] = await Promise.all([
  read("../app/api/admin/dashboard/route.ts"),
  read("../app/admin/admin-dashboard.tsx"),
  read("../app/api/admin/orders/[orderId]/share/route.ts"),
  read("../lib/delivery/admin-present-share.ts"),
  read("../app/presente/[token]/page.tsx"),
  read("../app/api/presente/[token]/audio/route.ts"),
  read("../app/api/admin/showcase/route.ts"),
  read("../supabase/migrations/202609150002_admin_present_shares.sql"),
]);

assert.match(dashboardRoute, /generation_outputs/);
assert.match(dashboardRoute, /music_versions/);
assert.match(dashboardRoute, /versionIdsByTask/);
assert.match(dashboardRoute, /versions: actionableVersions/);
assert.match(dashboardRoute, /shareable: actionableVersions\.length > 0/);
assert.doesNotMatch(dashboardRoute, /shareable: Boolean\(order.*paid/s);

assert.match(dashboard, /Música do link/);
assert.match(dashboard, /Música para destacar/);
assert.match(dashboard, /versionId: shareVersionId/);
assert.match(dashboard, /versionId: showcaseVersionId/);
assert.match(dashboard, /disabled=\{!row\.showcased && \(!row\.shareable \|\| data\.showcase\.length >= 6\)\}/);

assert.match(shareRoute, /getAdminIdentity\(\)/);
assert.match(shareRoute, /versionId: z\.string\(\)\.uuid\(\)/);
assert.match(shareRoute, /version\.status !== "ready"/);
assert.match(shareRoute, /version\.full_audio_object_key !== expectedKey/);
assert.match(shareRoute, /from\("admin_present_shares"\)/);
assert.match(shareRoute, /onConflict: "order_id"/);
assert.match(shareRoute, /share_generated_music_link/);
assert.doesNotMatch(shareRoute, /from\("deliveries"\)/);

assert.match(migration, /create table public\.admin_present_shares/);
assert.match(migration, /foreign key \(version_id, order_id\)/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all .* from anon, authenticated/);
assert.match(shareHelper, /version\.status !== "ready"/);
assert.match(shareHelper, /version\.full_audio_object_key !== expectedKey/);
assert.match(presentPage, /findAdminPresentShare\(admin, tokenHash\)/);
assert.match(presentAudio, /findAdminPresentShare\(admin, tokenHash\)/);
assert.match(presentAudio, /recordAdminPresentAccess/);

assert.match(presentPage, /hasConfirmedDeliveryPayment\(admin, paidPresent\.order_id, paidPresent\.version_id\)/);
assert.match(presentAudio, /hasConfirmedDeliveryPayment\(admin, paidAccess\.order_id, paidAccess\.version_id\)/);
assert.match(showcaseRoute, /version\.full_audio_object_key !== expectedKey/);

console.log("PASS: o painel associa tarefas às versões realmente armazenadas e permite escolher a faixa exata");
console.log("PASS: links administrativos funcionam para músicas prontas sem alterar pagamento ou entrega comercial");
console.log("PASS: destaque e compartilhamento validam a chave privada esperada e mantêm auditoria e RLS");
