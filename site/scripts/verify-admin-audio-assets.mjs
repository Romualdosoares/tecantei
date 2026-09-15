import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [route, dashboard, previewRoute, landing] = await Promise.all([
  read("../app/api/admin/generations/[taskId]/assets/route.ts"),
  read("../app/admin/admin-dashboard.tsx"),
  read("../app/api/orders/[orderId]/versions/[versionId]/preview/route.ts"),
  read("../components/te-cantei-app.tsx"),
]);

assert.match(route, /getAdminIdentity\(\)/);
assert.match(route, /reason: z\.string\(\)\.trim\(\)\.min\(8\)\.max\(300\)/);
assert.match(route, /generation_outputs/);
assert.match(route, /\.eq\("storage_status", "stored"\)/);
assert.match(route, /music_versions/);
assert.match(route, /version\.preview_object_key === expectedPreviewKey/);
assert.match(route, /version\.full_audio_object_key === expectedFullKey/);
assert.match(route, /createSignedUrl\(previewKey, SIGNED_URL_SECONDS/);
assert.match(route, /createSignedUrl\(fullKey, SIGNED_URL_SECONDS, \{ download:/);
assert.match(route, /admin_audit_log/);
assert.match(route, /access_generation_audio/);
assert.match(route, /"Cache-Control": "private, no-store"/);
assert.doesNotMatch(route, /source_audio_url/);

assert.match(dashboard, /\/api\/admin\/generations\/\$\{assetGeneration\.id\}\/assets/);
assert.match(dashboard, /Localizar e abrir áudios/);
assert.match(dashboard, /<audio controls preload="metadata" src=\{asset\.previewUrl\}/);
assert.match(dashboard, /Baixar prévia/);
assert.match(dashboard, /Baixar música completa/);
assert.match(dashboard, /Motivo do acesso/);

assert.match(previewRoute, /const SIGNED_URL_SECONDS = 10 \* 60/);
assert.doesNotMatch(landing, /setPlaying/);
assert.doesNotMatch(landing, /<Pause/);
assert.match(landing, /Demonstração sem áudio: nenhum MP3 foi criado neste modo/);
assert.match(landing, /somente o modelo da página de entrega/);

console.log("PASS: o admin acessa somente áudios armazenados, por links temporários e com auditoria obrigatória");
console.log("PASS: prévia e música completa reais podem ser baixadas no histórico de gerações");
console.log("PASS: a demonstração não exibe mais controles falsos de reprodução");
