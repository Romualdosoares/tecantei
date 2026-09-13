export type PaymentProviderName = "efi" | "mercado_pago";
export type NormalizedPaymentStatus = "pending" | "confirmed" | "failed" | "refunded";

export type PixChargeRequest = {
  amountCents: number;
  externalReference: string;
  idempotencyKey: string;
  payerEmail?: string;
  expirationSeconds?: number;
  notificationUrl?: string;
};

export type PixCharge = {
  provider: PaymentProviderName;
  externalId: string;
  externalReference: string | null;
  amountCents: number;
  currency: "BRL";
  status: NormalizedPaymentStatus;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
};

export type ProviderHttpRequest = {
  method: "GET" | "POST" | "PUT";
  url: string;
  headers: Record<string, string>;
  body?: string;
  tls?: {
    pfxBase64: string;
    passphrase?: string;
  };
};

export type ProviderHttpResponse = {
  status: number;
  body: unknown;
};

export type ProviderHttpTransport = (request: ProviderHttpRequest) => Promise<ProviderHttpResponse>;

export interface PixPaymentProvider {
  createPixCharge(request: PixChargeRequest): Promise<PixCharge>;
  getPixCharge(externalId: string): Promise<PixCharge>;
}

export function assertPixChargeRequest(request: PixChargeRequest) {
  if (!Number.isSafeInteger(request.amountCents) || request.amountCents <= 0 || request.amountCents > 100_000_000) {
    throw new Error("amountCents inválido");
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(request.externalReference)) {
    throw new Error("externalReference inválida");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.idempotencyKey)) {
    throw new Error("idempotencyKey deve ser UUID v4");
  }
  if (request.expirationSeconds !== undefined && (!Number.isInteger(request.expirationSeconds) || request.expirationSeconds < 60 || request.expirationSeconds > 86_400)) {
    throw new Error("expirationSeconds deve ficar entre 60 e 86400");
  }
  if (request.notificationUrl !== undefined) {
    const url = safeUrl(request.notificationUrl);
    if (!url || url.protocol !== "https:") throw new Error("notificationUrl deve usar HTTPS");
  }
}

export function centsFromProviderAmount(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error("valor inválido na resposta do provedor");
  return Math.round(numeric * 100);
}

export function limitedString(value: unknown, maxLength = 8_192) {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) return null;
  return value;
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
