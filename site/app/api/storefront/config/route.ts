import { NextResponse } from "next/server";
import { getApplicationSettings } from "@/lib/admin/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getApplicationSettings(createSupabaseAdminClient());
    return NextResponse.json({ productPriceCents: settings.productPriceCents, currency: "BRL" }, {
      headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  } catch {
    return NextResponse.json({ productPriceCents: 1_990, currency: "BRL" }, {
      headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
    });
  }
}
