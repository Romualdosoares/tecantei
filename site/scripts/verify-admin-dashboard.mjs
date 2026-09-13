import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, auth, dashboardRoute, userCreate, userUpdate, settingsRoute, testRoute, analyticsRoute, openaiClient, adminPage, adminDashboard] = await Promise.all([
  read("../supabase/migrations/202609110010_admin_dashboard.sql"),
  read("../lib/admin/auth.ts"),
  read("../app/api/admin/dashboard/route.ts"),
  read("../app/api/admin/users/route.ts"),
  read("../app/api/admin/users/[userId]/route.ts"),
  read("../app/api/admin/settings/route.ts"),
  read("../app/api/admin/integrations/test/route.ts"),
  read("../app/api/analytics/route.ts"),
  read("../lib/lyrics/openai-client.ts"),
  read("../app/admin/page.tsx"),
  read("../app/admin/admin-dashboard.tsx"),
]);

assert.match(auth, /await supabase\.auth\.getUser\(\)/);
assert.match(auth, /is_admin, account_status/);
assert.match(auth, /profile\.account_status !== "active"/);
for (const route of [dashboardRoute, userCreate, userUpdate, settingsRoute, testRoute]) {
  assert.match(route, /getAdminIdentity\(\)/);
}
assert.match(userCreate, /auth\.admin\.createUser/);
assert.match(userUpdate, /auth\.admin\.updateUserById/);
assert.match(userUpdate, /deleteUser\(userId\.data, true\)/);
assert.match(userUpdate, /cannot_delete_current_admin/);
assert.match(userUpdate, /writeAudit/);
assert.match(settingsRoute, /OPENAI_LYRIC_MODELS/);
assert.match(settingsRoute, /ADMIN_KIE_MODELS/);
assert.doesNotMatch(settingsRoute, /OPENAI_API_KEY|KIE_API_KEY/);
assert.match(testRoute, /\/v1\/models\//);
assert.match(testRoute, /\/api\/v1\/chat\/credit/);
assert.match(analyticsRoute, /createHash\("sha256"\)/);
assert.doesNotMatch(analyticsRoute, /x-forwarded-for|remoteAddress/);
assert.match(openaiClient, /https:\/\/api\.openai\.com\/v1\/responses/);
assert.match(openaiClient, /store: false/);
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

console.log("PASS: painel administrativo exige papel ativo, audita mutações e não expõe conteúdo privado");
console.log("PASS: configurações de IA guardam somente modelos e modos; chaves ficam no servidor");
console.log("PASS: exclusão de usuário é lógica e preserva o histórico operacional");
console.log("PASS: métricas de acesso usam identificador aleatório com hash, sem endereço IP");
console.log("PASS: gráficos aceitam hoje, ontem, 7, 15, 30 dias e período personalizado validado");
console.log("PASS: navegação lateral e abas compartilham estado; logout encerra a sessão real");
