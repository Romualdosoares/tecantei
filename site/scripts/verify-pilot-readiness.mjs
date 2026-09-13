import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const readProjectFile = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const migrationDirectoryUrl = new URL("../supabase/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationDirectoryUrl))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migration = (
  await Promise.all(
    migrationFiles.map((file) => readFile(new URL(file, migrationDirectoryUrl), "utf8")),
  )
).join("\n");

const [
  generationRoute,
  adjustmentRoute,
  callbackRoute,
  outputWorkerRoute,
  outputWorker,
  vercelConfig,
  checkoutRoute,
  fullAudioRoute,
  presentPage,
  orderEditor,
  homePage,
  orderOptions,
  kieContractTest,
  domainTest,
  storageTest,
] = await Promise.all([
  readProjectFile("../app/api/orders/[orderId]/generation/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/adjustment/route.ts"),
  readProjectFile("../app/api/kie/callback/route.ts"),
  readProjectFile("../app/api/jobs/generation-outputs/route.ts"),
  readProjectFile("../lib/music/generation-output-worker.ts"),
  readProjectFile("../vercel.json"),
  readProjectFile("../app/api/orders/[orderId]/checkout/route.ts"),
  readProjectFile("../app/api/orders/[orderId]/audio/route.ts"),
  readProjectFile("../app/presente/[token]/page.tsx"),
  readProjectFile("../app/pedidos/[orderId]/order-editor.tsx"),
  readProjectFile("../app/page.tsx"),
  readProjectFile("../lib/order-options.ts"),
  readProjectFile("./verify-kie-contract.mjs"),
  readProjectFile("./verify-domain.mjs"),
  readProjectFile("./verify-generation-storage.mjs"),
]);

const scenarios = [
  {
    id: 1,
    name: "duplo clique em gerar",
    verify() {
      assert.match(migration, /request_key text not null unique/);
      assert.match(migration, /logical_key := 'original:'[\s\S]*?where request_key = logical_key/);
      assert.match(generationRoute, /claim_generation_submission/);
      assert.match(generationRoute, /generation_security_not_configured/);
      assert.match(adjustmentRoute, /generation_security_not_configured/);
    },
  },
  {
    id: 2,
    name: "timeout após envio",
    verify() {
      assert.match(kieContractTest, /KieSubmissionUnknownError/);
      assert.match(generationRoute, /acceptanceUnknown[\s\S]*?reconciling/);
      assert.doesNotMatch(generationRoute, /setInterval\s*\(|while\s*\(/);
    },
  },
  {
    id: 3,
    name: "ajustes simultâneos",
    verify() {
      assert.match(migration, /where id = target_order_id and adjustment_status = 'available'/);
      assert.match(migration, /generation_task_id uuid unique references public\.generation_tasks\(id\)/);
      assert.match(adjustmentRoute, /reserve_budgeted_adjustment_generation/);
    },
  },
  {
    id: 4,
    name: "falha técnica do ajuste",
    verify() {
      assert.match(migration, /set status = 'technical_failure'/);
      assert.match(migration, /set adjustment_status = 'available'/);
      assert.match(migration, /cost_events_task_operation_unique/);
    },
  },
  {
    id: 5,
    name: "callback repetido ou atrasado",
    verify() {
      assert.match(migration, /on conflict \(generation_task_id, provider_audio_id\) do update/);
      assert.match(kieContractTest, /advanceGenerationState\("succeeded", "processing"\), "succeeded"/);
      assert.match(callbackRoute, /verifyKieWebhook/);
      assert.match(callbackRoute, /after\(async \(\) =>/);
      assert.match(callbackRoute, /hasKieAllowedAudioHostsConfigured/);
      assert.match(outputWorker, /processGenerationOutputBatch/);
      assert.match(outputWorkerRoute, /processGenerationOutputBatch\(10\)/);
      assert.match(vercelConfig, /\/api\/jobs\/generation-outputs/);
    },
  },
  {
    id: 6,
    name: "áudio completo antes do pagamento",
    verify() {
      assert.match(fullAudioRoute, /\.in\("status", \["paid", "delivered"\]\)/);
      assert.match(fullAudioRoute, /delivery\.version_id !== selection\.version_id/);
      assert.match(domainTest, /FULL_AUDIO_FOR_OWNER_SQL[\s\S]*?undefined/);
    },
  },
  {
    id: 7,
    name: "acesso cruzado entre usuários",
    verify() {
      assert.match(migration, /owner_id = auth\.uid\(\)/);
      assert.match(fullAudioRoute, /\.eq\("owner_id", authData\.user\.id\)/);
      assert.match(domainTest, /ownOrder\.get\("order-bob", "account-alice"\), undefined/);
    },
  },
  {
    id: 8,
    name: "pagamento pendente ou repetido",
    verify() {
      assert.match(migration, /on conflict \(provider, external_event_id\) do nothing/);
      assert.match(migration, /when payment_record\.status = 'confirmed' then 'confirmed'/);
      assert.match(checkoutRoute, /prepare_mock_checkout/);
    },
  },
  {
    id: 9,
    name: "compra da original após ajuste",
    verify() {
      assert.match(migration, /where version\.id = target_version_id[\s\S]*?and version\.status = 'ready'/);
      assert.match(migration, /insert into public\.order_selections\(order_id, version_id, selected_at\)/);
      assert.match(orderEditor, /A versão original continua guardada/);
    },
  },
  {
    id: 10,
    name: "retenção própria após expirar a origem",
    verify() {
      assert.match(migration, /source_audio_url = ''/);
      assert.match(storageTest, /copyFullAudioToPrivateStorage/);
      assert.match(storageTest, /storedRecord\.sourceUrl, ""/);
    },
  },
  {
    id: 11,
    name: "privacidade da página do presente",
    verify() {
      assert.doesNotMatch(presentPage, /\.story|\.pronunciation|approved_lyric|briefing/i);
      assert.match(presentPage, /robots: \{ index: false, follow: false \}/);
      assert.match(migration, /delivery\.share_enabled_at is not null[\s\S]*?delivery\.revoked_at is null/);
    },
  },
  {
    id: 12,
    name: "compreensão em celular nos estados críticos",
    verify() {
      assert.match(homePage, /grid gap-8 lg:grid-cols-/);
      assert.match(homePage, /RadioGroup[\s\S]*?grid grid-cols-2 gap-3/);
      assert.match(homePage, /Nenhum reenvio automático foi feito/);
      assert.match(orderEditor, /Estamos conferindo se o fornecedor recebeu o pedido/);
      assert.match(orderEditor, /retorno do navegador, sozinho, nunca libera o MP3/);
    },
  },
];

for (const scenario of scenarios) {
  scenario.verify();
  console.log(`PASS SIMULADO ${scenario.id}/12: ${scenario.name}`);
}

for (const sample of ["João", "Vitória", "Luís Otávio", "Conceição", "Tainá"]) {
  assert.equal(new TextEncoder().encode(sample).length > sample.length, true);
  assert.match(sample, /^[\p{L}\p{M} .'-]+$/u);
}
for (const style of ["Sertanejo", "Sertanejo romântico", "Piseiro", "Pagode animado", "Pagode romântico", "Funk", "Funk ostentação", "Funknejo", "Acústico", "Gospel", "Pop", "Pop romântico", "MPB", "Romântico", "Outro"]) {
  assert.ok(orderOptions.includes(`"${style}"`), `Estilo ausente da experiência: ${style}`);
}
assert.match(orderOptions, /Voz masculina/);
assert.match(orderOptions, /Voz feminina/);
assert.match(homePage, /Qual ritmo você deseja/);
for (const recipientOption of ["Esposo(a)", "Namorado(a)", "Reconciliação", "Noivo(a)", "Crush/Paixão", "Amigo(a)", "Mãe", "Pai", "Filho(a)", "Irmão(ã)", "Eu mesmo", "Outro"]) {
  assert.ok(homePage.includes(`"${recipientOption}"`), `Opção de homenageado ausente: ${recipientOption}`);
}
assert.match(homePage, /1\. Para quem é a música\?/);
assert.match(homePage, /Qual é o nome da pessoa homenageada\?/);
assert.match(homePage, /\["Para quem", "História", "Memórias", "Estilo", "Mensagem", "Letra", "Prévia", "Entrega"\]/);
assert.match(homePage, /Compartilhe suas memórias favoritas/);
assert.match(homePage, /Uma mensagem do coração/);
assert.match(homePage, /Gerar minha letra/);
assert.match(homePage, /Quero minha música inteira/);
assert.match(homePage, /step === 8/);
assert.match(homePage, /favoriteMemories\.trim\(\)[\s\S]*?heartMessage\.trim\(\)/);
assert.match(homePage, /Apelido Carinhoso|Como esse nome é pronunciado/);
assert.match(homePage, /minLength: 200, maxLength: 4000/);

console.log("PASS SIMULADO: amostra textual cobre nomes com acentos, pronúncia e gêneros brasileiros");
console.log("AVISO: esta checagem estrutural não substitui a inspeção visual; integrações reais exigem Supabase, Kie.ai e pagamento configurados");
