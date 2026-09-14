import "server-only";

export type PaymentMode = "mock" | "live";
export type PaymentProvider = "efi" | "mercado_pago";

export function getPaymentMode(): PaymentMode {
  const mode = process.env.PAYMENT_MODE?.trim() || "mock";
  if (mode !== "mock" && mode !== "live") {
    throw new Error("PAYMENT_MODE deve ser mock ou live.");
  }
  return mode;
}

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER?.trim() || "mercado_pago";
  if (provider !== "efi" && provider !== "mercado_pago") {
    throw new Error("PAYMENT_PROVIDER deve ser efi ou mercado_pago.");
  }
  return provider;
}

export function assertLivePaymentConfiguration() {
  if (getPaymentMode() !== "live" || process.env.PAYMENT_LIVE_ENABLED?.trim() !== "true") {
    throw new Error("Pagamento real exige PAYMENT_MODE=live e PAYMENT_LIVE_ENABLED=true.");
  }
  const provider = getPaymentProvider();
  const required = provider === "mercado_pago"
    ? ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"]
    : ["EFI_CLIENT_ID", "EFI_CLIENT_SECRET", "EFI_PIX_KEY", "EFI_CERTIFICATE_P12_BASE64", "EFI_WEBHOOK_TOKEN", "EFI_WEBHOOK_MTLS_GATEWAY_SECRET"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) throw new Error(`Configuração ${provider} incompleta: ${missing.join(", ")}.`);
}

export function assertPaymentLiveEnabled() {
  if (getPaymentMode() !== "live" || process.env.PAYMENT_LIVE_ENABLED?.trim() !== "true") {
    throw new Error("Pagamento real exige PAYMENT_MODE=live e PAYMENT_LIVE_ENABLED=true.");
  }
}

export function requireMockPaymentSimulation() {
  if (getPaymentMode() !== "mock") {
    throw new Error("O simulador de pagamento só funciona em PAYMENT_MODE=mock.");
  }
  if (process.env.PAYMENT_MOCK_CONFIRMATION_ENABLED?.trim() !== "true") {
    throw new Error("PAYMENT_MOCK_CONFIRMATION_ENABLED precisa ser true para simular eventos.");
  }
}
