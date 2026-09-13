import { createHmac, timingSafeEqual } from "node:crypto";

export type MercadoPagoWebhookSignature = {
  dataId: string;
  requestId: string;
  signature: string | null;
};

export function verifyMercadoPagoWebhook(
  input: MercadoPagoWebhookSignature,
  secret: string,
  now = Date.now(),
  toleranceSeconds: number | null = null,
) {
  if (secret.length < 24 || !/^[A-Za-z0-9._:-]{1,128}$/.test(input.dataId) || !/^[A-Za-z0-9._:-]{1,128}$/.test(input.requestId)) {
    return false;
  }
  if (toleranceSeconds !== null && (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0 || toleranceSeconds > 86_400)) return false;

  const parsed = parseSignature(input.signature);
  if (!parsed) return false;
  if (toleranceSeconds !== null) {
    const timestampNumber = Number(parsed.timestamp);
    if (!Number.isSafeInteger(timestampNumber)) return false;
    const timestampSeconds = timestampNumber > 9_999_999_999 ? Math.floor(timestampNumber / 1_000) : timestampNumber;
    if (Math.abs(Math.floor(now / 1_000) - timestampSeconds) > toleranceSeconds) return false;
  }

  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${parsed.timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest, "utf8").digest();
  const received = Buffer.from(parsed.digest, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function parseSignature(value: string | null) {
  if (!value || value.length > 512) return null;
  const fields = new Map<string, string>();
  for (const part of value.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    fields.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  const timestamp = fields.get("ts");
  const digest = fields.get("v1");
  if (!timestamp || !/^\d{10,13}$/.test(timestamp) || !digest || !/^[0-9a-f]{64}$/i.test(digest)) return null;
  return { timestamp, digest };
}
