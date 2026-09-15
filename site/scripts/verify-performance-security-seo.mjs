import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(join(siteRoot, path), "utf8");

const [config, layout, home, globals, robots, sitemap, manifest, ogImage] = await Promise.all([
  read("next.config.ts"),
  read("app/layout.tsx"),
  read("app/page.tsx"),
  read("app/globals.css"),
  read("app/robots.ts"),
  read("app/sitemap.ts"),
  read("app/manifest.ts"),
  read("app/opengraph-image.tsx"),
]);

for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
  assert.match(config, new RegExp(header), `Cabeçalho de segurança ausente: ${header}`);
}
assert.match(config, /frame-ancestors 'none'/);
assert.match(config, /object-src 'none'/);
assert.match(config, /poweredByHeader: false/);

assert.match(layout, /metadataBase:/);
assert.match(layout, /alternates: \{ canonical: "\/" \}/);
assert.match(layout, /openGraph:/);
assert.match(layout, /twitter:/);
assert.match(layout, /application\/ld\+json/);
assert.match(robots, /sitemap:/);
assert.match(robots, /"\/admin\/"/);
assert.match(sitemap, /https:\/\/tecantei\.vercel\.app/);
assert.match(manifest, /display: "standalone"/);
assert.match(ogImage, /1200/);
assert.match(ogImage, /630/);

assert.match(home, /id="conteudo-principal"/);
assert.match(home, /role="img" aria-label="Avaliações com cinco estrelas"/);
assert.match(home, /dynamic\(\(\) => import\("@\/components\/studio\/generation-progress-stage"\)/);
assert.match(globals, /\.tc-deferred-section \{/);
assert.match(globals, /content-visibility: auto/);
assert.doesNotMatch(globals, /:where\(\.tc-premium-frame,[^\n]+\)::after/, "A animação de borda não pode voltar a atingir todas as caixas");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  }))).flat();
}

const clientFiles = (await Promise.all([
  sourceFiles(join(siteRoot, "app")),
  sourceFiles(join(siteRoot, "components")),
])).flat();
for (const path of clientFiles) {
  const source = await readFile(path, "utf8");
  if (!/^\s*["']use client["'];/m.test(source)) continue;
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|KIE_API_KEY|EFI_CLIENT_SECRET|MERCADO_PAGO_ACCESS_TOKEN/, `Segredo do servidor referenciado em componente cliente: ${path}`);
}

console.log("PASS: SEO técnico inclui canonical, robots, sitemap, manifesto, Open Graph e dados estruturados");
console.log("PASS: cabeçalhos defensivos e isolamento contra iframe estão configurados");
console.log("PASS: experiência móvel evita animação global de caixas e adia a renderização fora da tela");
console.log("PASS: componentes cliente não referenciam credenciais privadas do servidor");
