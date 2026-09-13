import { fetchProviderTransport } from "./fetch-transport.ts";
import {
  assertPixChargeRequest,
  centsFromProviderAmount,
  limitedString,
  type NormalizedPaymentStatus,
  type PixCharge,
  type PixChargeRequest,
  type PixPaymentProvider,
  type ProviderHttpTransport,
} from "./types.ts";

const API_BASE_URL = "https://api.mercadopago.com";

export class MercadoPagoApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Mercado Pago respondeu HTTP ${status}`);
    this.name = "MercadoPagoApiError";
    this.status = status;
  }
}

export class MercadoPagoPixClient implements PixPaymentProvider {
  private readonly accessToken: string;
  private readonly transport: ProviderHttpTransport;

  constructor(
    accessToken: string,
    transport: ProviderHttpTransport = fetchProviderTransport,
  ) {
    if (accessToken.trim().length < 12) throw new Error("Access Token do Mercado Pago inválido.");
    this.accessToken = accessToken;
    this.transport = transport;
  }

  async createPixCharge(request: PixChargeRequest): Promise<PixCharge> {
    assertPixChargeRequest(request);
    if (!request.payerEmail || !/^\S+@\S+\.\S+$/.test(request.payerEmail)) {
      throw new Error("E-mail do pagador é obrigatório para Pix no Mercado Pago.");
    }

    const response = await this.transport({
      method: "POST",
      url: `${API_BASE_URL}/v1/payments`,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": request.idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: request.amountCents / 100,
        description: "Música personalizada Te Cantei",
        payment_method_id: "pix",
        payer: { email: request.payerEmail },
        external_reference: request.externalReference,
        ...(request.notificationUrl ? { notification_url: request.notificationUrl } : {}),
      }),
    });
    if (response.status !== 200 && response.status !== 201) throw new MercadoPagoApiError(response.status);
    return normalizeMercadoPagoCharge(response.body);
  }

  async getPixCharge(externalId: string): Promise<PixCharge> {
    if (!/^\d{1,32}$/.test(externalId)) throw new Error("ID de pagamento Mercado Pago inválido.");
    const response = await this.transport({
      method: "GET",
      url: `${API_BASE_URL}/v1/payments/${externalId}`,
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: "application/json" },
    });
    if (response.status !== 200) throw new MercadoPagoApiError(response.status);
    return normalizeMercadoPagoCharge(response.body);
  }
}

function normalizeMercadoPagoCharge(value: unknown): PixCharge {
  if (!value || typeof value !== "object") throw new Error("Resposta inválida do Mercado Pago.");
  const payment = value as Record<string, unknown>;
  const id = String(payment.id ?? "");
  if (!/^\d{1,32}$/.test(id)) throw new Error("Pagamento Mercado Pago sem ID válido.");
  if (payment.currency_id !== "BRL") throw new Error("Moeda inesperada do Mercado Pago.");
  const pointOfInteraction = asRecord(payment.point_of_interaction);
  const transactionData = asRecord(pointOfInteraction?.transaction_data);
  return {
    provider: "mercado_pago",
    externalId: id,
    externalReference: limitedString(payment.external_reference, 64),
    amountCents: centsFromProviderAmount(payment.transaction_amount),
    currency: "BRL",
    status: normalizeMercadoPagoStatus(payment.status),
    qrCode: limitedString(transactionData?.qr_code),
    qrCodeBase64: limitedString(transactionData?.qr_code_base64, 1_000_000),
    ticketUrl: httpsUrlOrNull(transactionData?.ticket_url),
    expiresAt: isoDateOrNull(payment.date_of_expiration),
  };
}

function normalizeMercadoPagoStatus(value: unknown): NormalizedPaymentStatus {
  if (value === "approved") return "confirmed";
  if (value === "refunded" || value === "charged_back") return "refunded";
  if (["rejected", "cancelled", "cancelled_by_admin"].includes(String(value))) return "failed";
  return "pending";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function httpsUrlOrNull(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isoDateOrNull(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
