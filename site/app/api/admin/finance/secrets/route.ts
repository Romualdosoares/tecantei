import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { deletePaymentSecret, PAYMENT_SECRET_NAMES, putPaymentSecret, type PaymentSecretName } from "@/lib/admin/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "private, no-store" };
const reason = z.string().trim().min(8).max(300);
const saveSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("mercado_pago"),
    accessToken: z.string().trim().min(12).max(4096).optional(),
    webhookSecret: z.string().trim().min(24).max(4096).optional(),
    reason,
  }),
  z.object({
    provider: z.literal("efi"),
    clientId: z.string().trim().min(8).max(4096).optional(),
    clientSecret: z.string().trim().min(8).max(4096).optional(),
    pixKey: z.string().trim().min(1).max(4096).optional(),
    certificateP12Base64: z.string().trim().min(16).max(2_000_000).optional(),
    certificatePassphrase: z.string().trim().min(1).max(4096).optional(),
    webhookToken: z.string().trim().min(24).max(4096).optional(),
    webhookMtlsGatewaySecret: z.string().trim().min(24).max(4096).optional(),
    reason,
  }),
]).refine((value) => value.provider === "mercado_pago"
  ? Boolean(value.accessToken || value.webhookSecret)
  : Boolean(value.clientId || value.clientSecret || value.pixKey || value.certificateP12Base64 || value.certificatePassphrase || value.webhookToken || value.webhookMtlsGatewaySecret));
const deleteSchema = z.object({ provider: z.enum(["mercado_pago", "efi"]), reason });

export async function POST(request: Request) {
  const input = saveSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_payment_secret" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    const entries = secretEntries(input.data);
    for (const [name, value] of entries) {
      await putPaymentSecret(admin, name, value, identity.id, input.data.reason);
    }
    return NextResponse.json({ configured: true, updatedFields: entries.length }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "payment_secret_update_failed" }, { status: 503, headers: NO_STORE });
  }
}

export async function DELETE(request: Request) {
  const input = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_payment_secret" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    for (const name of providerSecretNames(input.data.provider)) {
      await deletePaymentSecret(admin, name, identity.id, input.data.reason);
    }
    return NextResponse.json({ configured: false }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "payment_secret_delete_failed" }, { status: 503, headers: NO_STORE });
  }
}

function secretEntries(input: z.infer<typeof saveSchema>): Array<[PaymentSecretName, string]> {
  const mapped = input.provider === "mercado_pago"
    ? [[PAYMENT_SECRET_NAMES.mercadoPagoAccessToken, input.accessToken], [PAYMENT_SECRET_NAMES.mercadoPagoWebhookSecret, input.webhookSecret]] as const
    : [
      [PAYMENT_SECRET_NAMES.efiClientId, input.clientId],
      [PAYMENT_SECRET_NAMES.efiClientSecret, input.clientSecret],
      [PAYMENT_SECRET_NAMES.efiPixKey, input.pixKey],
      [PAYMENT_SECRET_NAMES.efiCertificateP12Base64, input.certificateP12Base64],
      [PAYMENT_SECRET_NAMES.efiCertificatePassphrase, input.certificatePassphrase],
      [PAYMENT_SECRET_NAMES.efiWebhookToken, input.webhookToken],
      [PAYMENT_SECRET_NAMES.efiWebhookMtlsGatewaySecret, input.webhookMtlsGatewaySecret],
    ] as const;
  return mapped.filter((entry): entry is [PaymentSecretName, string] => typeof entry[1] === "string" && entry[1].length > 0);
}

function providerSecretNames(provider: "mercado_pago" | "efi"): PaymentSecretName[] {
  return provider === "mercado_pago"
    ? [PAYMENT_SECRET_NAMES.mercadoPagoAccessToken, PAYMENT_SECRET_NAMES.mercadoPagoWebhookSecret]
    : [PAYMENT_SECRET_NAMES.efiClientId, PAYMENT_SECRET_NAMES.efiClientSecret, PAYMENT_SECRET_NAMES.efiPixKey, PAYMENT_SECRET_NAMES.efiCertificateP12Base64, PAYMENT_SECRET_NAMES.efiCertificatePassphrase, PAYMENT_SECRET_NAMES.efiWebhookToken, PAYMENT_SECRET_NAMES.efiWebhookMtlsGatewaySecret];
}
