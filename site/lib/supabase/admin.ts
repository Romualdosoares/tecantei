import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  requireSupabasePublicConfig,
  requireSupabaseSecretKey,
} from "./env";

export function createSupabaseAdminClient() {
  const config = requireSupabasePublicConfig();

  return createClient(config.url, requireSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
