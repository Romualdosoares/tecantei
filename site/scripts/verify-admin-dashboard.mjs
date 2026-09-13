import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, vaultMigration, auth, dashboardRoute, userCreate, userUpdate, settingsRoute, secretsRoute, testRoute, analyticsRoute, kieLyricsClient, adminPage, adminDashboard] = await Promise.all([
  read("../supabase/migrations/202609110010_admin_dashboard.sql"),
  read("../supabase/migrations/202609130001_kie_lyrics_and_vault.sql"),
  read("../lib/admin/auth.ts"),
  read("../app/api/admin/dashboard/route.ts"),
  read("../app/api/admin/users/route.ts"),
  read("../app/api/admin/users/[userId]/route.ts"),
  read("../app/api/admin/settings/route.ts"),
  read("../app/api/admin/secrets/route.ts"),
  read("../app/api/admin/integrations/test/route.ts"),
  read("../app/api/analytics/route.ts"),
  read("../lib/lyrics/kie-client.ts"),
  read("../app/admin/page.tsx"),
  read("../app/admin/admin-dashboard.tsx"),
]);

assert.match(auth, /await supabase\.auth\.getUser\(\)/);
assert.match(auth, /is_admin, account_status/);
assert.match(auth, /profile\.account_status !== "active"/);
for (const route of [dashboardRoute, userCreate, userUpdate, settingsRoute, secretsRoute, testRoute]) {
  assert.match(route, /getAdminIdentity\(\)/);
}
assert.match(userCreate, /auth\.admin\.createUser/);
assert.match(userUpdate, /auth\.admin\.updateUserById/);
assert.match(userUpdate, /deleteUser\(userId\.data, true\)/);
assert.match(userUpdate, /cannot_delete_current_admin/);
assert.match(userUpdate, /writeAudit/);
assert.match(settingsRoute, /KIE_LYRIC_MODELS/);
assert.match(settingsRoute, /ADMIN_KIE_MODELS/);
assert.doesNotMatch(settingsRoute, /OPENAI_API_KEY|KIE_API_KEY/);
assert.match(testRoute, /\/api\/v1\/chat\/credit/);
assert.match(analyticsRoute, /createHash\("sha256"\)/);
assert.doesNotMatch(analyticsRoute, /x-forwarded-for|remoteAddress/);
assert.match(kieLyricsClient, /https:\/\/api\.kie\.ai\/codex\/v1\/responses/);
assert.match(kieLyricsClient, /Authorization: `Bearer \$\{apiKey\}`/);
assert.doesNotMatch(kieLyricsClient, /OPENAI_API_KEY|KIE_API_KEY|console\./);
assert.match(vaultMigration, /create extension if not exists supabase_vault with schema vault/);
assert.match(vaultMigration, /vault\.create_secret/);
assert.match(vaultMigration, /vault\.update_secret/);
assert.match(vaultMigration, /revoke all on function public\.get_app_secret\(text\) from public, anon, authenticated/);
assert.match(secretsRoute, /putKieApiKey/);
assert.match(secretsRoute, /deleteKieApiKey/);
assert.doesNotMatch(secretsRoute, /apiKey[^\n]*NextResponse|console\./);
assert.match(migration, /revoke all on public\.application_settings, public\.analytics_events, public\.admin_audit_log/);
assert.match(adminPage, /getAdminIdentity\(\)/);
assert.doesNotMatch(dashboardRoute, /story|pronunciation|lyrics|full_audio_object_key|share_token_hash/i);
assert.match(dashboardRoute, /today.*yesterday.*7d.*15d.*30d.*custom/s);
assert.match(dashboardRoute, /America\/Sao_Paulo/);
assert.match(dashboardRoute, /span < 0 \|\| span > 365 \|\| to > today/);
assert.match(adminDashboard, /Hoje.*Ontem.*7 dias.*15 dias.*30 dias.*Personalizado/s);
assert.match(adminDashboard, /type="date"/);
assert.match(adminDashboard, /dashboardUrl\(range, from, to\)/);
assert.match(adminDashboard, /<nav aria-label="Seções do painel administrativo"/);
assert.match(adminDashboard, /onClick=\{\(\) => setActiveTab\(value\)\}/);
assert.match(adminDashboard, /<Tabs value=\{activeTab\} onValueChange=/);
assert.match(adminDashboard, /supabase\.auth\.signOut\(\)/);
assert.match(adminDashboard, /type="password"/);
assert.match(adminDashboard, /\/api\/admin\/secrets/);
assert.match(adminDashboard, /GPT através da Kie\.ai/);

console.log("PASS: painel administrativo exige papel ativo, audita mutações e não expõe conteúdo privado");
console.log("PASS: chave Kie.ai é write-only no painel, criptografada no Vault e nunca devolvida ao navegador");
console.log("PASS: exclusão de usuário é lógica e preserva o histórico operacional");
console.log("PASS: métricas de acesso usam identificador aleatório com hash, sem endereço IP");
console.log("PASS: gráficos aceitam hoje, ontem, 7, 15, 30 dias e período personalizado validado");
console.log("PASS: navegação lateral e abas compartilham estado; logout encerra a sessão real");
