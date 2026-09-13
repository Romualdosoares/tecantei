import { NextResponse } from "next/server";
import { z } from "zod";
import { createShareToken, hashShareToken } from "@/lib/delivery/share-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const inputSchema = z.object({
  dedication: z.string().trim().min(1).max(500),
});
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!orderId.success || !input.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const token = createShareToken();
    const tokenHash = await hashShareToken(token);
    if (!tokenHash) throw new Error("share_token_failed");
    const { data, error } = await supabase.rpc("rotate_delivery_share", {
      target_order_id: orderId.data,
      target_token_hash: tokenHash,
      target_dedication: input.data.dedication,
    });
    if (error || !isShareResult(data)) {
      return NextResponse.json({ error: "delivery_not_shareable" }, { status: 409 });
    }

    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const origin = configuredOrigin || new URL(request.url).origin;
    const shareUrl = new URL(`/presente/${token}`, origin).toString();
    return NextResponse.json({ shareUrl, dedication: data.dedication }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "share_unavailable" }, { status: 503 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const orderId = idSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }
    const { data, error } = await supabase.rpc("revoke_delivery_share", {
      target_order_id: orderId.data,
    });
    if (error || !data) {
      return NextResponse.json({ error: "delivery_not_shareable" }, { status: 409 });
    }
    return NextResponse.json({ revoked: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "share_unavailable" }, { status: 503 });
  }
}

function isShareResult(value: unknown): value is { delivery_id: string; dedication: string } {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return typeof result.delivery_id === "string" && typeof result.dedication === "string";
}
