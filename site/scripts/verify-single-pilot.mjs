import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [route, migration, generationRoute, adjustmentRoute] = await Promise.all([
  read("../app/api/jobs/music-pilot/route.ts"),
  read("../supabase/migrations/202609130004_single_music_pilot.sql"),
  read("../app/api/orders/[orderId]/generation/route.ts"),
  read("../app/api/orders/[orderId]/adjustment/route.ts"),
]);

assert.match(route, /PILOT_TRIGGER_ENABLED/);
assert.match(route, /PILOT_TRIGGER_SECRET/);
assert.match(route, /prepare_single_music_pilot/);
assert.match(route, /claim_generation_submission/);
assert.equal((route.match(/submitGeneration\(/g) ?? []).length, 1);
assert.match(route, /status !== "created"/);
assert.match(route, /apply_generation_callback/);
assert.match(route, /processGenerationOutputBatch/);
assert.doesNotMatch(route, /source_audio_url:\s*output\.source_audio_url/);
assert.match(migration, /pilot_request_id constant uuid/);
assert.match(migration, /where client_request_id = pilot_request_id/);
assert.match(migration, /revoke all on function public\.prepare_single_music_pilot\(\) from public, anon, authenticated/);
assert.match(generationRoute, /PILOT_ONLY_MODE/);
assert.match(adjustmentRoute, /PILOT_ONLY_MODE/);

console.log("PASS: piloto usa pedido sintético fixo, trava idempotente e uma única chamada de criação");
console.log("PASS: clientes e ajustes ficam bloqueados enquanto o modo exclusivo do piloto estiver ativo");
