import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "../../users/route";

const schema = z.object({
  productPriceCents: z.number().int().min(100).max(1_000_000),
  paymentProvider: z.enum(["mercado_pago", "efi"]),
  efiEnvironment: z.enum(["homologation", "production"]),
  reason: z.string().trim().min(8).max(300),
});
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function PATCH(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "invalid_financial_settings" }, { status: 400, headers: NO_STORE });
  try {
    const identity = await getAdminIdentity();
    if (!identity) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("application_settings").update({
      product_price_cents: input.data.productPriceCents,
      payment_provider: input.data.paymentProvider,
      efi_environment: input.data.efiEnvironment,
      updated_by: identity.id,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) throw error;
    await writeAudit(admin, identity.id, "update_financial_settings", "application_settings", "1", input.data.reason, {
      productPriceCents: input.data.productPriceCents,
      paymentProvider: input.data.paymentProvider,
      efiEnvironment: input.data.efiEnvironment,
    });
    return NextResponse.json({ updated: true, ...input.data }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "financial_settings_update_failed" }, { status: 503, headers: NO_STORE });
  }
}
