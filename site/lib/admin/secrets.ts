import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const KIE_API_SECRET_NAME = "kie_api_key";

export async function getKieApiKey(admin: SupabaseClient) {
  const { data, error } = await admin.rpc("get_app_secret", {
    target_name: KIE_API_SECRET_NAME,
  });
  if (!error && typeof data === "string" && data.trim()) return data.trim();
  return process.env.KIE_API_KEY?.trim() || null;
}

export async function putKieApiKey(admin: SupabaseClient, apiKey: string, actorId: string, reason: string) {
  const { error } = await admin.rpc("put_app_secret", {
    target_name: KIE_API_SECRET_NAME,
    target_value: apiKey.trim(),
    target_actor: actorId,
    target_reason: reason,
  });
  if (error) throw error;
}

export async function deleteKieApiKey(admin: SupabaseClient, actorId: string, reason: string) {
  const { data, error } = await admin.rpc("delete_app_secret", {
    target_name: KIE_API_SECRET_NAME,
    target_actor: actorId,
    target_reason: reason,
  });
  if (error) throw error;
  return Boolean(data);
}
