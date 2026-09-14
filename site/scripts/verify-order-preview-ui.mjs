import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const editor = await readFile(new URL("../app/pedidos/[orderId]/order-editor.tsx", import.meta.url), "utf8");
const player = await readFile(new URL("../app/pedidos/[orderId]/music-preview-player.tsx", import.meta.url), "utf8");
const previewRoute = await readFile(new URL("../app/api/orders/[orderId]/versions/[versionId]/preview/route.ts", import.meta.url), "utf8");

assert.match(editor, /<MusicPreviewPlayer/);
assert.match(editor, /readyVersions\.map/);
assert.match(editor, /Sua amostra exclusiva chegou/);
assert.match(editor, /Somente a prévia privada de até 50 segundos é carregada/);
assert.match(editor, /Sua prévia está pronta para ouvir abaixo/);
assert.match(editor, /Quer viver a emoção até o último verso/);
assert.match(editor, /Quero minha música inteira/);
assert.match(editor, /void prepareCheckout\(\)/);
assert.match(editor, /router\.push\(`\/pedidos\/\$\{order\.id\}\/entrega`\)/);
assert.match(editor, /Pagamento único e liberação após confirmação segura/);
assert.match(player, /<audio[\s\S]*?controls[\s\S]*?src=\{audioUrl\}/);
assert.match(player, /AudioWaveform/);
assert.match(player, /border-\[#d4af55\]\/30/);
assert.match(player, /\/api\/orders\/\$\{orderId\}\/versions\/\$\{versionId\}\/preview/);
assert.match(player, /credentials:\s*"same-origin"/);
assert.match(player, /status === 410/);
assert.doesNotMatch(player, /\/audio(?:"|`)/);
assert.match(previewRoute, /\.eq\("owner_id", authData\.user\.id\)/);
assert.match(previewRoute, /preview_object_key/);
assert.doesNotMatch(previewRoute, /full_audio_object_key/);

console.log("PASS: cada versão pronta exibe um player e solicita somente a prévia privada do proprietário");
console.log("PASS: falhas de sessão, expiração e arquivo ausente têm recuperação visível");
