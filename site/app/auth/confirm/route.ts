import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedDestinations = new Set(["/", "/auth/reset-password"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedDestination = url.searchParams.get("next") ?? "/";
  const destination = allowedDestinations.has(requestedDestination)
    ? requestedDestination
    : "/";

  try {
    const supabase = await createSupabaseServerClient();
    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        : { error: new Error("missing_confirmation_token") };

    if (!result.error) {
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  } catch {
    // A mensagem pública não revela configuração nem detalhes do token.
  }

  return NextResponse.redirect(new URL("/?auth=confirmation-error", url.origin));
}
