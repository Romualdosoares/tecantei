import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MUSIC_STYLE_OPTIONS } from "../lib/order-options.ts";
import { buildMusicDirection, getMusicStyleProfile } from "../lib/music/style-profiles.ts";
import { KieMusicClient } from "../lib/music/kie-client.ts";

for (const style of MUSIC_STYLE_OPTIONS.filter((value) => value !== "Outro")) {
  const profile = getMusicStyleProfile(style);
  assert.equal(profile.custom, false, `Falta perfil musical para ${style}`);
  assert.ok(profile.arrangement.length > 70);
  assert.ok(profile.lyricGuide.length > 70);
  for (const voice of ["masculina", "feminina"]) {
    const direction = buildMusicDirection(style, voice, "V6");
    assert.ok(direction.style.startsWith(`${style}.`));
    assert.ok(direction.style.length <= 1_000);
    assert.equal(direction.vocalGender, voice === "masculina" ? "m" : "f");
    assert.equal(direction.styleWeight, 0.9);
    assert.equal(direction.weirdnessConstraint, 0.3);
    assert.equal(direction.variety, 0);
    assert.ok(direction.negativeTags.length <= 1_000);
    assert.match(direction.style, /Brazilian Portuguese/);
  }
}
assert.match(getMusicStyleProfile("Piseiro").arrangement, /piseiro|pisadinha/i);
assert.match(getMusicStyleProfile("Pagode animado").arrangement, /cavaquinho/);
assert.match(getMusicStyleProfile("Trap Gospel").arrangement, /808/);
assert.match(getMusicStyleProfile("Funknejo").arrangement, /funk|tamborz/);
const custom = buildMusicDirection("Bossa nova com jazz", "feminina", "V6");
assert.ok(custom.style.startsWith("Bossa nova com jazz."));
assert.equal(getMusicStyleProfile("Bossa nova com jazz").custom, true);
assert.doesNotMatch(custom.negativeTags, /jazz|bossa/i);
assert.equal(getMusicStyleProfile("constructor").custom, true);
assert.equal(getMusicStyleProfile("toString").custom, true);
const adjusted = buildMusicDirection("Pagode romântico", "masculina", "V6", "Mais emoção e cavaquinho");
assert.match(adjusted.style, /Pagode romântico/);
assert.match(adjusted.style, /Mais emoção e cavaquinho/);
assert.equal(adjusted.variety, 0);
const legacy = buildMusicDirection("MPB", "feminina", "V4");
assert.ok(legacy.style.length <= 200);
assert.ok(legacy.style.startsWith("MPB."));
const legacyAdjusted = buildMusicDirection("MPB", "feminina", "V4", "Mais emoção");
assert.match(legacyAdjusted.style, /Mais emoção/);
assert.ok(legacyAdjusted.style.length <= 200);
assert.throws(() => buildMusicDirection("Trap Gospel", "masculina", "V6", "Mais emoção e presença. ".repeat(90)), /instruções de ajuste/);
const completeNotes = "Mais emoção no refrão. Mantenha a percussão leve. Destaque o cavaquinho no final.";
assert.ok(buildMusicDirection("Pagode romântico", "feminina", "V6", completeNotes).style.endsWith(completeNotes));

const approvedLyrics = "[Verso 1]\nHistória aprovada sem nenhuma alteração.";
let sent;
let calls = 0;
const client = new KieMusicClient("test-server-key", async (_url, init) => {
  calls++;
  sent = JSON.parse(init.body);
  return Response.json({ code: 200, data: { taskId: "task-style" } });
});
const request = { ...custom, approvedLyrics, title: "Canção", model: "V6", callbackUrl: "https://example.com/callback", durationSeconds: 180 };
await client.submitGeneration(request);
assert.equal(sent.prompt, approvedLyrics);
assert.equal(sent.styleWeight, 0.9);
assert.equal(sent.weirdnessConstraint, 0.3);
assert.equal(sent.variety, 0);
assert.equal(sent.negativeTags, custom.negativeTags);
assert.equal(sent.vocalGender, "f");
assert.equal(sent.audioWeight, undefined, "Sem referência de áudio, não enviar peso de áudio");
for (const invalid of [{ styleWeight: NaN }, { styleWeight: 1.01 }, { weirdnessConstraint: -0.1 }, { weirdnessConstraint: 0.333 }, { variety: 1.5 }, { negativeTags: "x".repeat(1_001) }, { vocalGender: "unknown" }]) {
  const before = calls;
  await assert.rejects(client.submitGeneration({ ...request, ...invalid }));
  assert.equal(calls, before, "Parâmetro inválido não pode chamar provedor");
}
for (const kind of ["generation", "adjustment"]) {
  const route = await readFile(new URL(`../app/api/orders/[orderId]/${kind}/route.ts`, import.meta.url), "utf8");
  assert.match(route, /buildMusicDirection\(/);
  if (kind === "adjustment") {
    assert.ok(route.indexOf("buildMusicDirection(order.style") < route.indexOf('"reserve_budgeted_adjustment_generation"'), "Notas devem ser validadas antes de reservar ajuste e orçamento");
    assert.match(route, /adjustment_notes_too_long/);
  }
}
console.log("PASS: estilos, voz, ajuste e controles musicais chegam ao provedor sem alterar a letra aprovada");
