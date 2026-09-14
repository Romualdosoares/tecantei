import { timingSafeEqual } from "node:crypto";

export type EfiPixNotification = {
  endToEndId: string;
  txid: string;
  amount: string;
  occurredAt: string;
};

// Endereço publicado pela Efí para callbacks Pix. A Vercel sobrescreve
// x-forwarded-for com o IP real da conexão, impedindo spoofing pelo cliente.
export const EFI_PIX_WEBHOOK_IPS = ["34.193.116.226"] as const;

export function verifyEfiWebhookToken(received: string | null, expected: string) {
  if (!received || expected.length < 24) return false;
  const receivedBytes = Buffer.from(received, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export function verifyEfiWebhookSourceIp(
  received: string | null,
  allowedIps: readonly string[] = EFI_PIX_WEBHOOK_IPS,
) {
  if (!received) return false;
  const normalized = received.split(",", 1)[0]?.trim().replace(/^::ffff:/i, "");
  return Boolean(normalized && allowedIps.some((allowedIp) => allowedIp === normalized));
}

export function parseEfiPixWebhook(value: unknown): EfiPixNotification[] {
  if (!value || typeof value !== "object") throw new Error("Webhook Efí inválido.");
  const pix = (value as Record<string, unknown>).pix;
  if (!Array.isArray(pix) || pix.length === 0 || pix.length > 20) throw new Error("Webhook Efí sem lista Pix válida.");
  return pix.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error("Item Pix inválido.");
    const item = entry as Record<string, unknown>;
    if (typeof item.endToEndId !== "string" || !/^[A-Za-z0-9]{20,64}$/.test(item.endToEndId)) throw new Error("endToEndId inválido.");
    if (typeof item.txid !== "string" || !/^[A-Za-z0-9]{26,35}$/.test(item.txid)) throw new Error("txid inválido.");
    if (typeof item.valor !== "string" || !/^\d{1,10}\.\d{2}$/.test(item.valor)) throw new Error("valor Pix inválido.");
    if (typeof item.horario !== "string" || Number.isNaN(Date.parse(item.horario))) throw new Error("horário Pix inválido.");
    return { endToEndId: item.endToEndId, txid: item.txid, amount: item.valor, occurredAt: new Date(item.horario).toISOString() };
  });
}
