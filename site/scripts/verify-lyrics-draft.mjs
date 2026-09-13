import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createMockLyricDraft } from "../lib/lyrics/draft-generator.ts";

const story = "João e Vitória se conheceram em uma festa de São João em Campina Grande. Depois viajaram pelo litoral, adotaram a cadela Lua e construíram uma família cheia de música. Agora celebram dez anos juntos com gratidão.";
const lyrics = createMockLyricDraft({
  occasion: "Casal",
  recipient: "Vitória",
  pronunciation: "Vi-tó-ria",
  story,
  style: "Forró acústico",
});

assert.match(lyrics, /^\[Verso 1\]/);
assert.match(lyrics, /Vitória/);
assert.match(lyrics, /festa de São João em Campina Grande/);
assert.match(lyrics, /viajaram pelo litoral/);
assert.match(lyrics, /\[Refrão final\]/);
assert.ok(lyrics.length >= 100 && lyrics.length <= 5_000);
assert.equal(createMockLyricDraft({ occasion: "Casal", recipient: "Vitória", story, style: "MPB" }), createMockLyricDraft({ occasion: "Casal", recipient: "Vitória", story, style: "MPB" }));

const [route, home, envExample] = await Promise.all([
  readFile(new URL("../app/api/lyrics/draft/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../.env.example", import.meta.url), "utf8"),
]);
assert.match(route, /MAX_BODY_BYTES = 8 \* 1_024/);
assert.match(route, /effectiveLyricsMode\(settings\.lyricsMode\)/);
assert.match(route, /createOpenAiLyricDraft/);
assert.match(route, /simulated: mode === "mock"/);
assert.doesNotMatch(route, /KieMusicClient|SUPABASE_SECRET_KEY/);
assert.doesNotMatch(home, /const demoLyrics/);
assert.match(home, /\/api\/lyrics\/draft/);
assert.match(home, /Rascunho simulado/);
assert.match(envExample, /LYRICS_GENERATION_MODE=mock/);
assert.match(envExample, /OPENAI_API_KEY=SUBSTITUA_NO_LIVE/);
assert.match(envExample, /OPENAI_LIVE_ENABLED=false/);

console.log("PASS: rascunho local usa nome, história e ocasião sem chamar a geração musical");
console.log("PASS: rota limita o corpo, alterna entre simulação e OpenAI e mantém a letra editável antes da aprovação");
