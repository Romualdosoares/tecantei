import { efiHttpsTransport } from "./efi-https-transport.ts";
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

export type EfiPixConfig = {
  environment: "homologation" | "production";
  clientId: string;
  clientSecret: string;
  pixKey: string;
  certificateP12Base64: string;
  certificatePassphrase?: string;
};

export class EfiPixApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Efí respondeu HTTP ${status}`);
    this.name = "EfiPixApiError";
    this.status = status;
  }
}

export class EfiPixClient implements PixPaymentProvider {
  private accessToken: { value: string; expiresAt: number } | null = null;
  private readonly config: EfiPixConfig;
  private readonly transport: ProviderHttpTransport;

  constructor(
    config: EfiPixConfig,
    transport: ProviderHttpTransport = efiHttpsTransport,
  ) {
    for (const [name, value] of Object.entries({ clientId: config.clientId, clientSecret: config.clientSecret, pixKey: config.pixKey, certificateP12Base64: config.certificateP12Base64 })) {
      if (value.trim().length < 8) throw new Error(`Configuração Efí inválida: ${name}.`);
    }
    this.config = config;
    this.transport = transport;
  }

  async createPixCharge(request: PixChargeRequest): Promise<PixCharge> {
    assertPixChargeRequest(request);
    const txid = efiTxidFromIdempotencyKey(request.idempotencyKey);
    const response = await this.authorizedRequest("PUT", `/v2/cob/${txid}`, JSON.stringify({
      calendario: { expiracao: request.expirationSeconds ?? 3_600 },
      valor: { original: formatCents(request.amountCents) },
      chave: this.config.pixKey,
      solicitacaoPagador: "Música personalizada Te Cantei",
      infoAdicionais: [{ nome: "Pedido", valor: request.externalReference }],
    }));
    if (response.status !== 200 && response.status !== 201) throw new EfiPixApiError(response.status);
    return this.withQrPayload(response.body, request.externalReference);
  }

  async getPixCharge(externalId: string): Promise<PixCharge> {
    if (!/^[A-Za-z0-9]{26,35}$/.test(externalId)) throw new Error("txid Efí inválido.");
    const response = await this.authorizedRequest("GET", `/v2/cob/${externalId}`);
    if (response.status !== 200) throw new EfiPixApiError(response.status);
    return this.withQrPayload(response.body, null);
  }

  private async withQrPayload(value: unknown, externalReference: string | null) {
    const charge = normalizeEfiCharge(value, externalReference);
    const locationId = efiLocationId(value);
    if (!locationId) return charge;
    const response = await this.authorizedRequest("GET", `/v2/loc/${locationId}/qrcode`);
    if (response.status !== 200 || !response.body || typeof response.body !== "object") return charge;
    const payload = response.body as Record<string, unknown>;
    return {
      ...charge,
      qrCode: limitedString(payload.qrcode) ?? charge.qrCode,
      qrCodeBase64: limitedString(payload.imagemQrcode, 1_000_000),
      ticketUrl: httpsUrlOrNull(payload.linkVisualizacao) ?? charge.ticketUrl,
    };
  }

  private async authorizedRequest(method: "GET" | "PUT", pathname: string, body?: string) {
    const token = await this.getAccessToken();
    return this.transport({
      method,
      url: `${this.baseUrl}${pathname}`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body,
      tls: this.tls,
    });
  }

  private async getAccessToken() {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) return this.accessToken.value;
    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`, "utf8").toString("base64");
    const response = await this.transport({
      method: "POST",
      url: `${this.baseUrl}/oauth/token`,
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json", "Accept-Encoding": "identity" },
      body: JSON.stringify({ grant_type: "client_credentials" }),
      tls: this.tls,
    });
    if (response.status !== 200 || !response.body || typeof response.body !== "object") throw new EfiPixApiError(response.status);
    const token = response.body as Record<string, unknown>;
    if (typeof token.access_token !== "string" || token.access_token.length < 8 || !Number.isFinite(Number(token.expires_in))) {
      throw new Error("Token OAuth inválido da Efí.");
    }
    const expiresIn = Math.max(60, Math.min(Number(token.expires_in), 86_400));
    this.accessToken = { value: token.access_token, expiresAt: Date.now() + expiresIn * 1_000 };
    return token.access_token;
  }

  private get baseUrl() {
    return this.config.environment === "production" ? "https://pix.api.efipay.com.br" : "https://pix-h.api.efipay.com.br";
  }

  private get tls() {
    return { pfxBase64: this.config.certificateP12Base64, passphrase: this.config.certificatePassphrase };
  }
}

export function efiTxidFromIdempotencyKey(idempotencyKey: string) {
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) throw new Error("UUID inválido para txid Efí.");
  const txid = idempotencyKey.replaceAll("-", "");
  if (!/^[A-Za-z0-9]{26,35}$/.test(txid)) throw new Error("txid Efí inválido.");
  return txid;
}

function normalizeEfiCharge(value: unknown, externalReference: string | null): PixCharge {
  if (!value || typeof value !== "object") throw new Error("Resposta inválida da Efí.");
  const charge = value as Record<string, unknown>;
  const txid = String(charge.txid ?? "");
  if (!/^[A-Za-z0-9]{26,35}$/.test(txid)) throw new Error("Cobrança Efí sem txid válido.");
  const amount = charge.valor && typeof charge.valor === "object" ? (charge.valor as Record<string, unknown>).original : null;
  const amountCents = centsFromProviderAmount(amount);
  const calendar = charge.calendario && typeof charge.calendario === "object" ? charge.calendario as Record<string, unknown> : null;
  return {
    provider: "efi",
    externalId: txid,
    externalReference,
    amountCents,
    currency: "BRL",
    status: normalizeEfiStatus(charge, amountCents),
    qrCode: limitedString(charge.pixCopiaECola),
    qrCodeBase64: null,
    ticketUrl: httpsUrlOrNull(charge.location),
    expiresAt: efiExpiration(calendar),
  };
}

function efiLocationId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const charge = value as Record<string, unknown>;
  const location = charge.loc && typeof charge.loc === "object" ? charge.loc as Record<string, unknown> : null;
  const id = Number(location?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeEfiStatus(charge: Record<string, unknown>, amountCents: number): NormalizedPaymentStatus {
  if (charge.status === "CONCLUIDA") {
    return refundedEfiCents(charge.devolucoes) >= amountCents ? "refunded" : "confirmed";
  }
  if (charge.status === "REMOVIDA_PELO_USUARIO_RECEBEDOR" || charge.status === "REMOVIDA_PELO_PSP") return "failed";
  return "pending";
}

function refundedEfiCents(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) return 0;
  return value.reduce((total: number, entry: unknown) => {
    if (!entry || typeof entry !== "object") return total;
    const refund = entry as Record<string, unknown>;
    if (refund.status !== "DEVOLVIDO") return total;
    try {
      return total + centsFromProviderAmount(refund.valor);
    } catch {
      return total;
    }
  }, 0);
}

function formatCents(value: number) {
  return (value / 100).toFixed(2);
}

function httpsUrlOrNull(value: unknown) {
  if (typeof value !== "string" || value.length > 2_048) return null;
  const withProtocol = value.startsWith("https://") ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function efiExpiration(calendar: Record<string, unknown> | null) {
  if (!calendar || typeof calendar.criacao !== "string") return null;
  const createdAt = Date.parse(calendar.criacao);
  const seconds = Number(calendar.expiracao);
  if (!Number.isFinite(createdAt) || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(createdAt + seconds * 1_000).toISOString();
}
