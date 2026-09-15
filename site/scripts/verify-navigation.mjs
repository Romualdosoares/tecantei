import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  }));
  return files.flat();
}

const files = await Promise.all([
  sourceFiles(join(siteRoot, "app")),
  sourceFiles(join(siteRoot, "components")),
]).then((groups) => groups.flat());
const sources = await Promise.all(files.map(async (path) => ({ path, source: await readFile(path, "utf8") })));
const allSource = sources.map(({ source }) => source).join("\n");
const pageSource = await readFile(join(siteRoot, "app", "page.tsx"), "utf8");
const adminSource = await readFile(join(siteRoot, "app", "admin", "admin-dashboard.tsx"), "utf8");

for (const { path, source } of sources) {
  assert.doesNotMatch(source, /href\s*=\s*(?:["']\s*["']|["']javascript:)/i, `Link inválido em ${path}`);
}

const fragmentLinks = [...allSource.matchAll(/href\s*=\s*["']#([^"']+)["']/g)].map((match) => match[1]);
for (const target of fragmentLinks) {
  assert.match(allSource, new RegExp(`id=["']${target}["']`), `Destino de fragmento ausente: ${target}`);
}

const knownStaticRoutes = new Set(["/", "/pedidos", "/suporte", "/auth/reset-password", "/admin/login"]);
const literalInternalLinks = [...allSource.matchAll(/href\s*=\s*["'](\/[^"'?#]*)["']/g)].map((match) => match[1]);
for (const href of literalInternalLinks) {
  assert.ok(knownStaticRoutes.has(href), `Rota interna literal sem página correspondente: ${href}`);
}

const scrollTargets = [...pageSource.matchAll(/scrollToSection\(["']([^"']+)["']\)/g)].map((match) => match[1]);
for (const target of scrollTargets) {
  assert.match(pageSource, new RegExp(`id=["']${target}["']`), `Destino de rolagem ausente: ${target}`);
}

for (const value of ["overview", "users", "generations", "sales", "finance", "integrations", "audit"]) {
  assert.match(adminSource, new RegExp(`value: ["']${value}["']`), `Item lateral ausente: ${value}`);
  assert.match(adminSource, new RegExp(`<TabsContent value=["']${value}["']`), `Conteúdo administrativo ausente: ${value}`);
}
assert.match(adminSource, /<nav aria-label="Seções do painel administrativo"/);
assert.match(adminSource, /onClick=\{\(\) => setActiveTab\(value\)\}/);
assert.match(adminSource, /<Tabs value=\{activeTab\} onValueChange=/);
assert.match(adminSource, /supabase\.auth\.signOut\(\)/);
assert.doesNotMatch(adminSource, /<Link href="\/">\s*<LogOut/);

assert.match(pageSource, /onClick=\{openOrderDelivery\}[^>]*>[\s\S]*?Abrir entrega e baixar/);
assert.match(pageSource, /onClick=\{openOrderDelivery\}[^>]*>[\s\S]*?Criar link do presente/);

console.log("PASS: links internos apontam para páginas existentes e não há hrefs vazios ou placeholders");
console.log("PASS: todos os atalhos de rolagem da landing possuem destino");
console.log("PASS: barra lateral administrativa controla as sete áreas e o logout encerra a sessão");
console.log("PASS: ações finais de download e compartilhamento conduzem à entrega real");
