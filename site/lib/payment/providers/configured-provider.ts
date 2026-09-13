import "server-only";

import { assertLivePaymentConfiguration, getPaymentProvider } from "../env";
import { EfiPixClient } from "./efi";
import { MercadoPagoPixClient } from "./mercado-pago";
import type { PixPaymentProvider } from "./types";

export function createConfiguredPixProvider(): PixPaymentProvider {
  assertLivePaymentConfiguration();
  const provider = getPaymentProvider();
  if (provider === "mercado_pago") {
    return new MercadoPagoPixClient(requiredEnv("MERCADO_PAGO_ACCESS_TOKEN"));
  }

  const environment = process.env.EFI_ENVIRONMENT?.trim() || "homologation";
  if (environment !== "homologation" && environment !== "production") {
    throw new Error("EFI_ENVIRONMENT deve ser homologation ou production.");
  }
  return new EfiPixClient({
    environment,
    clientId: requiredEnv("EFI_CLIENT_ID"),
    clientSecret: requiredEnv("EFI_CLIENT_SECRET"),
    pixKey: requiredEnv("EFI_PIX_KEY"),
    certificateP12Base64: requiredEnv("EFI_CERTIFICATE_P12_BASE64"),
    certificatePassphrase: process.env.EFI_CERTIFICATE_PASSPHRASE?.trim() || undefined,
  });
}

function requiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} não configurada.`);
  return value;
}
