import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { EfiPixClient, efiTxidFromIdempotencyKey } from "../lib/payment/providers/efi.ts";
import { parseEfiPixWebhook, verifyEfiWebhookSourceIp, verifyEfiWebhookToken } from "../lib/payment/providers/efi-webhook.ts";
import { MercadoPagoPixClient } from "../lib/payment/providers/mercado-pago.ts";
import { verifyMercadoPagoWebhook } from "../lib/payment/providers/mercado-pago-webhook.ts";

const idempotencyKey = "550e8400-e29b-41d4-a716-446655440000";

const mercadoPagoRequests = [];
const mercadoPagoResponses = [
  {
    status: 201,
    body: {
      id: 987654321,
      status: "pending",
      currency_id: "BRL",
      transaction_amount: 19.9,
      external_reference: "pedido_123",
      date_of_expiration: "2026-09-11T15:00:00-03:00",
      point_of_interaction: {
        transaction_data: {
          qr_code: "00020101021226pix-mercado-pago",
          qr_code_base64: "iVBORw0KGgo=",
          ticket_url: "https://www.mercadopago.com.br/payments/987654321/ticket",
        },
      },
    },
  },
  {
    status: 200,
    body: {
      id: 987654321,
      status: "approved",
      currency_id: "BRL",
      transaction_amount: 19.9,
      external_reference: "pedido_123",
      point_of_interaction: { transaction_data: {} },
    },
  },
];
const mercadoPagoClient = new MercadoPagoPixClient("APP_USR-token-seguro-de-teste", async (request) => {
  mercadoPagoRequests.push(request);
  return mercadoPagoResponses.shift();
});
const mercadoPagoCreated = await mercadoPagoClient.createPixCharge({
  amountCents: 1_990,
  externalReference: "pedido_123",
  idempotencyKey,
  payerEmail: "cliente@example.com",
  notificationUrl: "https://preview.example.com/api/webhooks/mercado-pago",
});
assert.equal(mercadoPagoCreated.provider, "mercado_pago");
assert.equal(mercadoPagoCreated.externalId, "987654321");
assert.equal(mercadoPagoCreated.amountCents, 1_990);
assert.equal(mercadoPagoCreated.status, "pending");
assert.match(mercadoPagoCreated.qrCode, /^000201/);
assert.equal(mercadoPagoRequests[0].url, "https://api.mercadopago.com/v1/payments");
assert.equal(mercadoPagoRequests[0].headers.Authorization, "Bearer APP_USR-token-seguro-de-teste");
assert.equal(mercadoPagoRequests[0].headers["X-Idempotency-Key"], idempotencyKey);
assert.deepEqual(JSON.parse(mercadoPagoRequests[0].body), {
  transaction_amount: 19.9,
  description: "Música personalizada Te Cantei",
  payment_method_id: "pix",
  payer: { email: "cliente@example.com" },
  external_reference: "pedido_123",
  notification_url: "https://preview.example.com/api/webhooks/mercado-pago",
});
assert.equal((await mercadoPagoClient.getPixCharge("987654321")).status, "confirmed");
assert.equal(mercadoPagoRequests[1].method, "GET");

const webhookSecret = "segredo-mercado-pago-123456789";
const webhookTimestamp = "1789142400";
const webhookDataId = "987654321";
const webhookRequestId = "request-abc-123";
const webhookManifest = `id:${webhookDataId};request-id:${webhookRequestId};ts:${webhookTimestamp};`;
const webhookDigest = createHmac("sha256", webhookSecret).update(webhookManifest).digest("hex");
const validMercadoPagoWebhook = {
  dataId: webhookDataId,
  requestId: webhookRequestId,
  signature: `ts=${webhookTimestamp},v1=${webhookDigest}`,
};
assert.equal(verifyMercadoPagoWebhook(validMercadoPagoWebhook, webhookSecret, 1_789_142_400_000), true);
assert.equal(verifyMercadoPagoWebhook({ ...validMercadoPagoWebhook, dataId: "tampered" }, webhookSecret, 1_789_142_400_000), false);
assert.equal(verifyMercadoPagoWebhook(validMercadoPagoWebhook, webhookSecret, 1_789_143_000_000, 300), false);
assert.equal(verifyMercadoPagoWebhook({ ...validMercadoPagoWebhook, signature: "ts=1789142400,v1=á" }, webhookSecret, 1_789_142_400_000), false);

const efiRequests = [];
const efiTxid = efiTxidFromIdempotencyKey(idempotencyKey);
const efiResponses = [
  { status: 200, body: { access_token: "oauth-token-efi-teste", expires_in: 3_600 } },
  {
    status: 201,
    body: {
      txid: efiTxid,
      status: "ATIVA",
      valor: { original: "19.90" },
      calendario: { criacao: "2026-09-11T12:00:00Z", expiracao: 3_600 },
      pixCopiaECola: "00020101021226pix-efi",
      location: "pix-h.api.efipay.com.br/v2/loc/123/qrcode",
    },
  },
  {
    status: 200,
    body: {
      txid: efiTxid,
      status: "CONCLUIDA",
      valor: { original: "19.90" },
      calendario: { criacao: "2026-09-11T12:00:00Z", expiracao: 3_600 },
      pixCopiaECola: "00020101021226pix-efi",
    },
  },
  {
    status: 200,
    body: {
      txid: efiTxid,
      status: "CONCLUIDA",
      valor: { original: "19.90" },
      calendario: { criacao: "2026-09-11T12:00:00Z", expiracao: 3_600 },
      devolucoes: [{ id: "refund-1", valor: "19.90", status: "DEVOLVIDO" }],
    },
  },
];
const efiClient = new EfiPixClient({
  environment: "homologation",
  clientId: "Client_Id_efi_teste",
  clientSecret: "Client_Secret_efi_teste",
  pixKey: "pix@example.com",
  certificateP12Base64: "Y2VydGlmaWNhZG8tZGUtdGVzdGU=",
}, async (request) => {
  efiRequests.push(request);
  return efiResponses.shift();
});
const efiCreated = await efiClient.createPixCharge({
  amountCents: 1_990,
  externalReference: "pedido_123",
  idempotencyKey,
  expirationSeconds: 3_600,
});
assert.equal(efiCreated.provider, "efi");
assert.equal(efiCreated.externalId, efiTxid);
assert.equal(efiCreated.amountCents, 1_990);
assert.equal(efiCreated.status, "pending");
assert.equal(efiRequests[0].url, "https://pix-h.api.efipay.com.br/oauth/token");
assert.match(efiRequests[0].headers.Authorization, /^Basic /);
assert.ok(efiRequests.every((request) => request.tls?.pfxBase64));
assert.equal(efiRequests[1].method, "PUT");
assert.equal(efiRequests[1].url, `https://pix-h.api.efipay.com.br/v2/cob/${efiTxid}`);
assert.deepEqual(JSON.parse(efiRequests[1].body), {
  calendario: { expiracao: 3_600 },
  valor: { original: "19.90" },
  chave: "pix@example.com",
  solicitacaoPagador: "Música personalizada Te Cantei",
  infoAdicionais: [{ nome: "Pedido", valor: "pedido_123" }],
});
assert.equal((await efiClient.getPixCharge(efiTxid)).status, "confirmed");
assert.equal((await efiClient.getPixCharge(efiTxid)).status, "refunded");
assert.equal(efiRequests.filter((request) => request.url.endsWith("/oauth/token")).length, 1);

const efiWebhookToken = "token-webhook-efi-com-24-chars";
assert.equal(verifyEfiWebhookToken(efiWebhookToken, efiWebhookToken), true);
assert.equal(verifyEfiWebhookToken("token-incorreto", efiWebhookToken), false);
assert.equal(verifyEfiWebhookSourceIp("34.193.116.226"), true);
assert.equal(verifyEfiWebhookSourceIp("::ffff:34.193.116.226"), true);
assert.equal(verifyEfiWebhookSourceIp("198.51.100.8"), false);
assert.equal(verifyEfiWebhookSourceIp("198.51.100.8, 34.193.116.226"), false);
assert.deepEqual(parseEfiPixWebhook({
  pix: [{
    endToEndId: "E12345678202609111500abcdefghijk",
    txid: efiTxid,
    valor: "19.90",
    horario: "2026-09-11T15:00:00-03:00",
  }],
}), [{
  endToEndId: "E12345678202609111500abcdefghijk",
  txid: efiTxid,
  amount: "19.90",
  occurredAt: "2026-09-11T18:00:00.000Z",
}]);

console.log("PASS: Mercado Pago cria e consulta Pix com idempotência e normalização");
console.log("PASS: assinatura HMAC do webhook Mercado Pago rejeita adulteração e admite janela temporal opcional");
console.log("PASS: Efí usa OAuth2, mTLS e txid determinístico em todas as chamadas Pix");
console.log("PASS: webhook Efí exige token adicional e valida a lista Pix");
console.log("PASS: webhook Efí direto aceita somente o IP oficial publicado");
