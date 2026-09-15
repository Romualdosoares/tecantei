import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const loginPage = await readFile(new URL("../app/admin/login/page.tsx", import.meta.url), "utf8");
const loginForm = await readFile(new URL("../app/admin/login/admin-login-form.tsx", import.meta.url), "utf8");
const adminPage = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
const sessionRoute = await readFile(new URL("../app/api/admin/session/route.ts", import.meta.url), "utf8");
const footer = await readFile(new URL("../components/landing/footer.tsx", import.meta.url), "utf8");
const landingPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

assert.match(loginPage, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
assert.match(loginPage, /if \(identity\) redirect\("\/admin"\)/);
assert.match(loginForm, /supabase\.auth\.signInWithPassword/);
assert.match(loginForm, /fetch\("\/api\/admin\/session"/);
assert.match(loginForm, /await supabase\.auth\.signOut\(\)/);
assert.match(loginForm, /resetPasswordForEmail/);
assert.doesNotMatch(loginForm, /console\.(?:log|error).*password/i);
assert.match(adminPage, /if \(!identity\) redirect\("\/admin\/login"\)/);
assert.match(sessionRoute, /await getAdminIdentity\(\)/);
assert.match(sessionRoute, /status:\s*404/);
assert.match(sessionRoute, /"Cache-Control":\s*"private, no-store"/);
assert.doesNotMatch(footer, /href=["']\/admin(?:\/login)?["']/);
assert.match(landingPage, /href="\/criar"/);
assert.doesNotMatch(landingPage, /href=["']\/admin(?:\/login)?["']/);

console.log("PASS: login administrativo autentica, valida o papel no servidor e encerra sessões sem permissão");
console.log("PASS: /admin redireciona visitantes ao login sem expor atalho administrativo na landing");
