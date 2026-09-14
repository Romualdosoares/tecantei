import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json({ authorized: true }, { headers: NO_STORE });
}
