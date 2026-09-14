import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const migrationDirectoryUrl = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationDirectoryUrl))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migration = (
  await Promise.all(
    migrationFiles.map((file) => readFile(new URL(file, migrationDirectoryUrl), "utf8")),
  )
).join("\n");

const readProjectFile = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const [
  envExample,
  proxy,
  previewRoute,
  fullAudioRoute,
  approveDraftRoute,
  briefingRoute,
  lyricsRevisionRoute,
  lyricsApprovalRoute,
  generationRoute,
  adjustmentRoute,
  kieCallbackRoute,
  generationWorkerRoute,
  generationWorker,
  checkoutRoute,
  mockPaymentEventRoute,
  shareRoute,
  sharedAudioRoute,
  presentPage,
  shareToken,
  ordersPage,
  orderPage,
  orderEditor,
  supportRoute,
  supportPage,
  supportConsole,
] = await Promise.all([
  readProjectFile("../.env.example"),
  readProjectFile("../proxy.ts"),
  readProjectFile("../app/api/orders/[orderId]/versions/[versionId]/preview/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/audio/route.ts"),
  readProjectFile("../app/api/orders/approve-draft/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/briefing/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/lyrics/revisions/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/lyrics/approve/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/generation/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/adjustment/route.ts"),
  readProjectFile("../app/api/kie/callback/route.ts"),
  readProjectFile("../app/api/jobs/generation-outputs/route.ts"),
  readProjectFile("../lib/music/generation-output-worker.ts"),
  readProjectFile("../app/api/orders/[orderId]/checkout/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/checkout/mock-event/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/share/route.ts"),
  readProjectFile("../app/api/presente/[token]/audio/route.ts"),
  readProjectFile("../app/presente/[token]/page.tsx"),
  readProjectFile("../lib/delivery/share-token.ts"),
  readProjectFile("../app/pedidos/page.tsx"),
  readProjectFile("../app/pedidos/[orderId]/page.tsx"),
  readProjectFile("../app/pedidos/[orderId]/order-editor.tsx"),
  readProjectFile("../app/api/support/orders/[orderId]/route.ts"),
  readProjectFile("../app/suporte/page.tsx"),
  readProjectFile("../app/suporte/support-console.tsx"),
]);

const tables = [
  "profiles",
  "orders",
  "lyrics",
  "music_versions",
  "generation_tasks",
  "generation_outputs",
  "adjustment_requests",
  "order_selections",
  "payment_intents",
  "payment_events",
  "deliveries",
  "cost_events",
  "support_audit_log",
  "application_settings",
  "analytics_events",
  "admin_audit_log",
];

for (const table of tables) {
  assert.match(migration, new RegExp(`create table public\\.${table} \\(`));
  assert.match(
    migration,
    new RegExp(`alter table public\\.${table} enable row level security;`),
  );
}

assert.match(
  migration,
  /revoke all on all tables in schema public from anon, authenticated;/,
);
assert.match(migration, /owner_id = auth\.uid\(\)/);
assert.match(migration, /auth\.uid\(\) is not null/);
assert.match(migration, /create or replace function public\.reserve_adjustment/);
assert.match(migration, /create or replace function public\.approve_new_order/);
assert.match(migration, /create or replace function public\.revise_order_briefing/);
assert.match(migration, /create or replace function public\.propose_lyrics_revision/);
assert.match(migration, /create or replace function public\.approve_latest_lyrics/);
assert.match(migration, /create or replace function public\.reserve_original_generation/);
assert.match(migration, /create or replace function public\.reserve_adjustment_generation/);
assert.match(migration, /create or replace function public\.reserve_budgeted_original_generation/);
assert.match(migration, /create or replace function public\.reserve_budgeted_adjustment_generation/);
assert.match(migration, /create or replace function public\.claim_generation_submission/);
assert.match(migration, /create or replace function public\.record_generation_submission\(/);
assert.match(migration, /create or replace function public\.record_generation_submission_failure/);
assert.match(migration, /create or replace function public\.apply_generation_callback/);
assert.match(migration, /create or replace function public\.claim_generation_output/);
assert.match(migration, /create or replace function public\.record_generation_output_failure/);
assert.match(migration, /create or replace function public\.publish_generation_output/);
assert.match(migration, /create or replace function public\.prepare_mock_checkout/);
assert.match(migration, /create or replace function public\.apply_mock_payment_event/);
assert.match(migration, /create or replace function public\.rotate_delivery_share/);
assert.match(migration, /create or replace function public\.revoke_delivery_share/);
assert.match(migration, /create or replace function public\.get_shared_present\(/);
assert.match(migration, /create or replace function public\.get_shared_present_audio/);
assert.match(migration, /create or replace function public\.record_delivery_access/);
assert.match(migration, /client_request_id uuid not null unique/);
assert.match(migration, /\(new_order_id, 'source', 1, customer_story\)/);
assert.match(migration, /\(new_order_id, 'proposed', 1, approved_content\)/);
assert.match(migration, /\(new_order_id, 'approved', 1, approved_content\)/);
assert.match(migration, /and adjustment_status = 'available'/);
assert.match(migration, /and status in \('draft', 'lyrics_review', 'lyrics_approved'\)/);
assert.match(migration, /and revision = \([\s\S]*?select max\(revision\)/);
assert.match(migration, /logical_key := 'original:' \|\| target_order_id::text \|\| ':' \|\| approved_id::text/);
assert.match(migration, /where id = target_task_id and status = 'created'/);
assert.match(migration, /set status = 'reconciling'/);
assert.match(migration, /grant execute on function public\.claim_generation_submission\(uuid\) to service_role/);
assert.match(migration, /cost_events_task_operation_unique/);
assert.match(migration, /generation_task_id uuid unique references public\.generation_tasks\(id\)/);
assert.match(migration, /'adjustment:' \|\| target_order_id::text \|\| ':'/);
assert.match(migration, /adjustment_record\.status <> 'technical_failure'/);
assert.match(migration, /set adjustment_status = 'available'/);
assert.match(migration, /on conflict \(generation_task_id, provider_audio_id\) do update/);
assert.match(migration, /when callback_type = 'complete' and output_count > 0 then 'succeeded'/);
assert.match(migration, /when response_code = 531 then 'refunded' else 'reconciling'/);
assert.match(migration, /track_origin := case when adjustment_id is null then 'original' else 'adjustment' end/);
assert.match(migration, /grant execute on function public\.apply_generation_callback\(text, text, integer, text, jsonb\) to service_role/);
assert.match(migration, /for update of output skip locked/);
assert.match(migration, /output\.storage_claimed_at < now\(\) - interval '10 minutes'/);
assert.match(migration, /storage_status = 'processing'/);
assert.match(migration, /preview_expires_at = coalesce\(preview_expires_at, now\(\) \+ interval '14 days'\)/);
assert.match(migration, /grant execute on function public\.publish_generation_output\(uuid, text, text\) to service_role/);
assert.match(migration, /if output_record\.origin = 'adjustment' then/);
assert.match(migration, /set status = 'completed', updated_at = now\(\)/);
assert.match(migration, /client_request_id uuid unique/);
assert.match(migration, /order_record\.status not in \('preview_ready', 'payment_pending'\)/);
assert.match(migration, /order_record\.adjustment_status = 'reserved'/);
assert.match(migration, /and version\.full_audio_object_key is not null/);
assert.match(migration, /insert into public\.order_selections/);
assert.match(migration, /amount_cents,[\s\S]*?currency,[\s\S]*?status[\s\S]*?1990,[\s\S]*?'BRL',[\s\S]*?'pending'/);
assert.match(migration, /and status in \('created', 'pending'\)[\s\S]*?return jsonb_build_object/);
assert.match(migration, /on conflict \(provider, external_event_id\) do nothing/);
assert.match(migration, /payment_record\.status = 'confirmed' then 'confirmed'/);
assert.match(migration, /payment_selection_mismatch/);
assert.match(migration, /delivery_version_mismatch/);
assert.match(migration, /set status = 'paid'/);
assert.match(migration, /grant execute on function public\.apply_mock_payment_event\(uuid, text, text, text, text\) to service_role/);
assert.match(migration, /target_token_hash !~ '\^\[a-f0-9\]\{64\}\$'/);
assert.match(migration, /set share_token_hash = target_token_hash/);
assert.match(migration, /share_enabled_at = now\(\)/);
assert.match(migration, /set revoked_at = now\(\)/);
assert.match(migration, /grant execute on function public\.rotate_delivery_share\(uuid, text, text\) to authenticated/);
assert.match(migration, /grant execute on function public\.get_shared_present\(text\) to service_role/);
assert.match(migration, /grant execute on function public\.get_shared_present_audio\(text\) to service_role/);
assert.match(migration, /delivery\.share_enabled_at is not null[\s\S]*?delivery\.revoked_at is null/);
assert.match(migration, /'recipient_name', order_row\.recipient_name/);
assert.match(migration, /add column is_support boolean not null default false/);
assert.match(migration, /add column is_admin boolean not null default false/);
assert.match(migration, /account_status text not null default 'active'/);
assert.match(migration, /revoke update \(is_support\) on public\.profiles from anon, authenticated/);
assert.match(migration, /revoke update \(is_admin, is_support, account_status\)/);
assert.doesNotMatch(migration, /grant update \([^)]*is_support[^)]*\) on public\.profiles to authenticated/);
assert.doesNotMatch(migration.match(/create or replace function public\.get_shared_present\([\s\S]*?revoke all on function public\.get_shared_present\(text\)/)?.[0] ?? "", /order_row\.(?:story|pronunciation)|lyrics\.content/);
assert.doesNotMatch(migration, /update public\.lyrics\s+set content/i);
assert.match(
  migration,
  /foreign key \(version_id, order_id\)[\s\S]*?references public\.music_versions\(id, order_id\)/,
);
assert.match(migration, /'te-cantei-audio',[\s\S]*?false,[\s\S]*?26214400/);
assert.doesNotMatch(migration, /create policy[\s\S]*?on storage\.objects/i);

assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=/);
assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/);
assert.match(envExample, /SUPABASE_SECRET_KEY=/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
assert.match(envExample, /SUBSTITUA/);
assert.match(envExample, /KIE_GENERATION_MODE=mock/);
assert.match(envExample, /KIE_LIVE_GENERATION_ENABLED=false/);
assert.match(envExample, /KIE_ALLOWED_AUDIO_HOSTS=/);
assert.match(envExample, /GENERATION_BUDGET_SCOPE=local/);
assert.match(envExample, /GENERATION_ACCOUNT_24H_CREDITS=/);
assert.match(envExample, /GENERATION_ENVIRONMENT_24H_CREDITS=/);
assert.match(envExample, /CRON_SECRET=/);
assert.match(envExample, /PAYMENT_MODE=mock/);
assert.match(envExample, /PAYMENT_LIVE_ENABLED=false/);
assert.match(envExample, /PAYMENT_MOCK_CONFIRMATION_ENABLED=false/);

assert.match(proxy, /await supabase\.auth\.getClaims\(\)/);
assert.match(proxy, /response\.cookies\.set/);
for (const route of [previewRoute, fullAudioRoute]) {
  assert.match(route, /await supabase\.auth\.getUser\(\)/);
  assert.match(route, /createSignedUrl\(expectedKey, SIGNED_URL_SECONDS/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
}
assert.match(fullAudioRoute, /delivery\.version_id !== selection\.version_id/);

for (const [route, rpc] of [
  [approveDraftRoute, "approve_new_order"],
  [briefingRoute, "revise_order_briefing"],
  [lyricsRevisionRoute, "propose_lyrics_revision"],
  [lyricsApprovalRoute, "approve_latest_lyrics"],
]) {
  assert.match(route, /await supabase\.auth\.getUser\(\)/);
  assert.ok(route.includes(`supabase.rpc("${rpc}"`));
}

assert.doesNotMatch(
  ordersPage,
  /select\("[^"\n]*(?:story|pronunciation)[^"\n]*"\)/,
);
assert.match(orderPage, /\.eq\("owner_id", authData\.user\.id\)/);
assert.match(orderPage, /\.from\("generation_tasks"\)/);

assert.match(generationRoute, /await supabase\.auth\.getUser\(\)/);
assert.match(generationRoute, /admin\.rpc\(\s*"reserve_budgeted_original_generation"/);
assert.match(generationRoute, /admin\.rpc\(\s*"claim_generation_submission"/);
assert.match(generationRoute, /if \(mode === "mock"\)/);
assert.match(generationRoute, /estimatedCreditsMillis = mode === "live"/);
assert.match(generationRoute, /generation_limit_reached/);
assert.match(generationRoute, /error instanceof KieSubmissionUnknownError/);
assert.match(generationRoute, /acceptance_unknown: acceptanceUnknown/);
assert.doesNotMatch(generationRoute, /while\s*\(|setInterval\s*\(|setTimeout\s*\(/);
assert.match(adjustmentRoute, /await supabase\.auth\.getUser\(\)/);
assert.match(adjustmentRoute, /admin\.rpc\(\s*"reserve_budgeted_adjustment_generation"/);
assert.match(adjustmentRoute, /admin\.rpc\(\s*"claim_generation_submission"/);
assert.match(adjustmentRoute, /estimatedCreditsMillis = mode === "live"/);
assert.match(adjustmentRoute, /generation_limit_reached/);
assert.match(adjustmentRoute, /error instanceof KieSubmissionUnknownError/);
assert.match(adjustmentRoute, /Ajuste solicitado/);
assert.doesNotMatch(adjustmentRoute, /while\s*\(|setInterval\s*\(|setTimeout\s*\(/);
assert.match(kieCallbackRoute, /x-webhook-timestamp/);
assert.match(kieCallbackRoute, /x-webhook-signature/);
assert.match(kieCallbackRoute, /verifyKieWebhook/);
assert.match(kieCallbackRoute, /admin\.rpc\("apply_generation_callback"/);
assert.match(kieCallbackRoute, /MAX_CALLBACK_BYTES/);
assert.match(kieCallbackRoute, /"Cache-Control": "no-store"/);
assert.match(generationWorkerRoute, /authorization/);
assert.match(generationWorkerRoute, /constantTimeEqual/);
assert.match(generationWorkerRoute, /processGenerationOutputBatch/);
assert.match(generationWorker, /claim_generation_output/);
assert.match(generationWorker, /copyFullAudioToPrivateStorage/);
assert.match(generationWorker, /createAndStoreMp3Preview/);
assert.match(generationWorker, /publish_generation_output/);
assert.match(generationWorker, /record_generation_output_failure/);
assert.match(checkoutRoute, /const mode = getPaymentMode\(\)/);
assert.match(checkoutRoute, /await supabase\.auth\.getUser\(\)/);
assert.match(checkoutRoute, /supabase\.rpc\("prepare_mock_checkout"/);
assert.match(checkoutRoute, /supabase\.rpc\("prepare_provider_checkout"/);
assert.match(checkoutRoute, /provider\.createPixCharge/);
assert.match(checkoutRoute, /attachProviderCharge/);
assert.doesNotMatch(checkoutRoute, /generation_tasks|KieMusicClient/);
assert.match(mockPaymentEventRoute, /requireMockPaymentSimulation\(\)/);
assert.match(mockPaymentEventRoute, /await supabase\.auth\.getUser\(\)/);
assert.match(mockPaymentEventRoute, /\.from\("payment_intents"\)/);
assert.match(mockPaymentEventRoute, /admin\.rpc\("apply_mock_payment_event"/);
assert.match(mockPaymentEventRoute, /sha256Hex/);
assert.match(shareRoute, /await supabase\.auth\.getUser\(\)/);
assert.match(shareRoute, /supabase\.rpc\("rotate_delivery_share"/);
assert.match(shareRoute, /supabase\.rpc\("revoke_delivery_share"/);
assert.match(shareRoute, /"Cache-Control": "private, no-store"/);
assert.match(shareToken, /getRandomValues\(new Uint8Array\(32\)\)/);
assert.match(shareToken, /TOKEN_PATTERN = \/\^\[A-Za-z0-9_-\]\{43\}\$\//);
assert.match(sharedAudioRoute, /admin\.rpc\(\s*"get_shared_present_audio"/);
assert.match(sharedAudioRoute, /record_delivery_access/);
assert.match(sharedAudioRoute, /createSignedUrl\(access\.object_key, SIGNED_URL_SECONDS\)/);
assert.match(sharedAudioRoute, /"X-Robots-Tag": "noindex"/);
assert.match(presentPage, /robots: \{ index: false, follow: false \}/);
assert.match(presentPage, /get_shared_present/);
assert.doesNotMatch(presentPage, /\.story|\.pronunciation|lyrics|approved_lyric|briefing/i);
assert.match(orderEditor, /Iniciar cria(?:ç|Ã§)ão musical/);
assert.match(orderEditor, /Estamos conferindo se o fornecedor recebeu o pedido/);
assert.match(orderEditor, /Solicitar meu ajuste/);
assert.match(orderEditor, /pode mudar voz, melodia e arranjo/);
assert.match(orderEditor, /A versão original continua guardada/);
assert.match(orderEditor, /Quero minha música inteira/);
assert.match(orderEditor, /Pix copia e cola/);
assert.match(orderEditor, /A entrega é liberada somente após a confirmação consultada no gateway/i);
assert.match(orderEditor, /retorno do navegador, sozinho, nunca libera o MP3/);
assert.match(orderEditor, /Simular confirmação do servidor/);
assert.match(orderEditor, /História, briefing e letra continuam privados/);
assert.match(orderEditor, /Revogar link/);
assert.match(supportRoute, /await supabase\.auth\.getUser\(\)/);
assert.match(supportRoute, /\.select\("is_support"\)/);
assert.match(supportRoute, /if \(!profile\?\.is_support\)/);
assert.match(supportRoute, /createSupabaseAdminClient\(\)/);
assert.match(supportRoute, /\.from\("support_audit_log"\)\.insert/);
assert.match(supportRoute, /action: "view_order_diagnostics"/);
assert.doesNotMatch(supportRoute, /\.select\("[^"\n]*(?:story|pronunciation|lyrics|share_token_hash|object_key)[^"\n]*"\)/i);
assert.match(supportPage, /if \(!profile\?\.is_support\) redirect\("\/pedidos"\)/);
assert.match(supportConsole, /Toda consulta exige um motivo|Motivo da consulta/);
assert.match(supportConsole, /História, pronúncia, letra, tokens e chaves de arquivos não são retornados/);

console.log(
  "✓ Supabase: RLS, suporte, geração, ajuste, pagamento idempotente e Storage privado conferidos estaticamente",
);
