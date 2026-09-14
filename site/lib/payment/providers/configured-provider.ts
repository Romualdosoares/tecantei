import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPaymentSecret, PAYMENT_SECRET_NAMES } from "@/lib/admin/secrets";
import type { PaymentProvider } from "../env";
import { EfiPixClient } from "./efi";
import { MercadoPagoPixClient } from "./mercado-pago";
import type { PixPaymentProvider } from "./types";

export async function createConfiguredPixProvider(
  admin: SupabaseClient,
  provider: PaymentProvider,
  efiEnvironment: "homologation" | "production" = "homologation",
): Promise<PixPaymentProvider> {
  if (provider === "mercado_pago") {
    return new MercadoPagoPixClient(requiredSecret(
      await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.mercadoPagoAccessToken, "MERCADO_PAGO_ACCESS_TOKEN"),
      "MERCADO_PAGO_ACCESS_TOKEN",
    ));
  }

  const environment = efiEnvironment;
  return new EfiPixClient({
    environment,
    clientId: requiredSecret(await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiClientId, "EFI_CLIENT_ID"), "EFI_CLIENT_ID"),
    clientSecret: requiredSecret(await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiClientSecret, "EFI_CLIENT_SECRET"), "EFI_CLIENT_SECRET"),
    pixKey: requiredSecret(await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiPixKey, "EFI_PIX_KEY"), "EFI_PIX_KEY"),
    certificateP12Base64: requiredSecret(await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiCertificateP12Base64, "EFI_CERTIFICATE_P12_BASE64"), "EFI_CERTIFICATE_P12_BASE64"),
    certificatePassphrase: await getPaymentSecret(admin, PAYMENT_SECRET_NAMES.efiCertificatePassphrase, "EFI_CERTIFICATE_PASSPHRASE") ?? undefined,
  });
}

function requiredSecret(value: string | null, key: string) {
  if (!value) throw new Error(`${key} não configurada.`);
  return value;
}
