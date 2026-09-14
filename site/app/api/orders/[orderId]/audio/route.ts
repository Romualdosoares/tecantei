import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAudioBucket } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasConfirmedDeliveryPayment } from "@/lib/payment/confirmed-delivery";

const idSchema = z.string().uuid();
const SIGNED_URL_SECONDS = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const parsed = idSchema.safeParse((await context.params).orderId);
  if (!parsed.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const orderId = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .eq("owner_id", authData.user.id)
      .in("status", ["paid", "delivered"])
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: selection } = await supabase
      .from("order_selections")
      .select("version_id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!selection) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const admin = createSupabaseAdminClient();
    const { data: delivery } = await admin
      .from("deliveries")
      .select("id, version_id, full_audio_object_key, revoked_at")
      .eq("order_id", orderId)
      .is("revoked_at", null)
      .maybeSingle();
    if (!delivery) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (delivery.version_id !== selection.version_id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!(await hasConfirmedDeliveryPayment(admin, orderId, delivery.version_id))) {
      return NextResponse.json({ error: "payment_not_confirmed" }, { status: 403 });
    }

    const expectedKey = `orders/${orderId}/versions/${delivery.version_id}/full.mp3`;
    if (delivery.full_audio_object_key !== expectedKey) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const stream = new URL(request.url).searchParams.get("mode") === "stream";
    const { data, error } = await admin.storage
      .from(getSupabaseAudioBucket())
      .createSignedUrl(expectedKey, SIGNED_URL_SECONDS, stream ? undefined : { download: true });
    if (error || !data) throw error ?? new Error("signed_url_failed");
    await admin.rpc("record_delivery_access", {
      target_delivery_id: delivery.id,
    });

    return NextResponse.json(
      { url: data.signedUrl, expiresIn: SIGNED_URL_SECONDS },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
