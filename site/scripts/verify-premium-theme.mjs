import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [styles, logo, layout, landing, admin, adminLogin, orders, order, support, present, reset, pricing] = await Promise.all([
  read("../app/globals.css"),
  read("../components/brand-logo.tsx"),
  read("../app/layout.tsx"),
  read("../app/page.tsx"),
  read("../app/admin/admin-dashboard.tsx"),
  read("../app/admin/login/admin-login-form.tsx"),
  read("../app/pedidos/page.tsx"),
  read("../app/pedidos/[orderId]/page.tsx"),
  read("../app/suporte/page.tsx"),
  read("../app/presente/[token]/page.tsx"),
  read("../app/auth/reset-password/page.tsx"),
  read("../components/landing/testimonials-pricing-faq.tsx"),
]);

await access(new URL("../public/tecantei-logodourada.jpg", import.meta.url));

for (const token of [
  "--tc-onyx: #090807",
  "--tc-charcoal: #1a1813",
  "--tc-gold: #d4af55",
  "--tc-champagne: #f5d77e",
  "--tc-bronze: #8c6a2a",
  "--tc-sand: #b8ae99",
]) assert.ok(styles.includes(token), `Token visual ausente: ${token}`);

assert.match(styles, /--tc-metallic:\s*linear-gradient\(115deg, #8c6a2a 0%, #d4af55 35%, #f5d77e 52%, #d4af55 72%, #8c6a2a 100%\)/);
assert.match(styles, /button\.bg-gradient-to-r,[\s\S]*background-image: none !important/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /\.tc-logo-mark::after/);
assert.match(logo, /tecantei-logodourada\.jpg/);
assert.match(layout, /icon: "\/tecantei-logodourada\.jpg"/);

for (const source of [landing, admin, adminLogin, orders, order, support, present, reset]) {
  assert.match(source, /BrandLogo/, "Uma tela principal ainda não usa a identidade dourada");
}

for (const source of [landing, admin, adminLogin, orders, order, support, present, reset, pricing]) {
  assert.doesNotMatch(source, /src="\/te-cantei-logo\.png"/, "Logo anterior ainda referenciada");
}

assert.match(admin, /color: "#D4AF55"/);
assert.match(admin, /color: "#F5D77E"/);
assert.match(pricing, /bg-primary text-primary-foreground/);

console.log("PASS: paleta premium preto e dourado aplicada aos tokens globais e ao painel");
console.log("PASS: nova logo dourada aplicada às jornadas públicas, administrativas e de entrega");
console.log("PASS: botões usam ouro sólido, gradiente fica decorativo e animações respeitam redução de movimento");
