import assert from "node:assert/strict";
import {
  advanceGenerationState,
  KieMusicClient,
  KieSubmissionUnknownError,
  stateFromKieStatus,
} from "../lib/music/kie-client.ts";
import { parseKieGenerationCallback } from "../lib/music/kie-callback.ts";
import { verifyKieWebhook } from "../lib/music/kie-webhook.ts";

const requests = [];
const responses = [
  new Response(JSON.stringify({ code: 200, msg: "success", data: { taskId: "kie-task-1" } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }),
  new Response(JSON.stringify({
    code: 200,
    msg: "success",
    data: {
      taskId: "kie-task-1",
      status: "SUCCESS",
      errorCode: null,
      response: {
        sunoData: [
          { id: "track-1", audio_url: "https://audio.example/1.mp3", stream_audio_url: "https://audio.example/1", title: "Canção A", duration: 198.4, model_name: "chirp-v5-5" },
          { id: "track-2", audio_url: "https://audio.example/2.mp3", stream_audio_url: "https://audio.example/2", title: "Canção B", duration: 201.2, model_name: "chirp-v5-5" },
        ],
      },
    },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }),
];

const fakeFetch = async (input, init) => {
  requests.push({ url: String(input), init });
  return responses.shift();
};

const client = new KieMusicClient("server-only-test-key", fakeFetch);
const submitted = await client.submitGeneration({
  approvedLyrics: "[Verso]\nUma história brasileira",
  style: "MPB acústica, voz calorosa",
  title: "Te Cantei",
  model: "V6",
  callbackUrl: "https://example.com/api/kie/callback",
  durationSeconds: 180,
  vocalGender: "f",
});
assert.deepEqual(submitted, { externalTaskId: "kie-task-1" });
assert.equal(requests[0].url, "https://api.kie.ai/api/v1/generate");
assert.equal(requests[0].init.headers.Authorization, "Bearer server-only-test-key");
const sentBody = JSON.parse(requests[0].init.body);
assert.equal(sentBody.customMode, true);
assert.equal(sentBody.instrumental, false);
assert.equal(sentBody.model, "V6");
assert.equal(sentBody.duration, 180);
assert.equal(sentBody.vocalGender, "f");

const completed = await client.getTask("kie-task-1");
assert.equal(completed.state, "succeeded");
assert.equal(completed.tracks.length, 2);
assert.equal(requests[1].url, "https://api.kie.ai/api/v1/generate/record-info?taskId=kie-task-1");

const unknownClient = new KieMusicClient("server-only-test-key", async () => {
  throw new Error("connection reset after upload");
});
await assert.rejects(
  unknownClient.submitGeneration({
    approvedLyrics: "Letra aprovada",
    style: "Pop",
    title: "Teste",
    model: "V5",
    callbackUrl: "https://example.com/callback",
  }),
  KieSubmissionUnknownError,
);

assert.equal(stateFromKieStatus("FIRST_SUCCESS"), "processing");
assert.equal(stateFromKieStatus("CALLBACK_EXCEPTION"), "reconciling");
assert.equal(advanceGenerationState("processing", "submitted"), "processing");
assert.equal(advanceGenerationState("succeeded", "processing"), "succeeded");
assert.equal(advanceGenerationState("reconciling", "processing"), "processing");

await assert.rejects(
  client.submitGeneration({
    approvedLyrics: "Letra aprovada",
    style: "MPB",
    title: "Duração inválida",
    model: "V5",
    callbackUrl: "https://example.com/callback",
    durationSeconds: 180,
  }),
  /só é aceita pelos modelos V5\.5 ou V6/,
);

const now = 1_800_000_000;
const timestamp = String(now - 5);
const taskId = "kie-task-1";
const secret = "webhook-test-secret";
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);
const digest = await crypto.subtle.sign(
  "HMAC",
  key,
  new TextEncoder().encode(`${taskId}.${timestamp}`),
);
const signature = btoa(String.fromCharCode(...new Uint8Array(digest)));

assert.equal(await verifyKieWebhook({ taskId, timestamp, signature, hmacKey: secret, nowSeconds: now }), true);
assert.equal(await verifyKieWebhook({ taskId: "tampered", timestamp, signature, hmacKey: secret, nowSeconds: now }), false);
assert.equal(await verifyKieWebhook({ taskId, timestamp: String(now - 301), signature, hmacKey: secret, nowSeconds: now }), false);

const validCallback = parseKieGenerationCallback({
  code: 200,
  msg: "All generated successfully.",
  data: {
    callbackType: "complete",
    task_id: taskId,
    data: [{
      id: "audio-1",
      audio_url: "https://cdn.example.com/audio-1.mp3",
      duration: 181.4,
      title: "Te Cantei",
      model_name: "chirp-v5",
    }],
  },
});
assert.equal(validCallback.success, true);
assert.equal(parseKieGenerationCallback({
  code: 200,
  data: {
    callbackType: "complete",
    task_id: taskId,
    data: [{ id: "audio-1", audio_url: "http://unsafe.test/a.mp3", duration: 180 }],
  },
}).success, false);

console.log("PASS: contrato de geração usa o endpoint, modelo e limites atuais da Kie.ai");
console.log("PASS: uma tarefa pode retornar múltiplas faixas sem duplicar o pedido");
console.log("PASS: envio ambíguo exige conciliação antes de uma nova tentativa");
console.log("PASS: estados atrasados não regridem uma tarefa concluída");
console.log("PASS: assinatura HMAC e janela antirreplay do callback são verificadas");
console.log("PASS: callback aceita somente estrutura limitada e URLs de áudio HTTPS");
