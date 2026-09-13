import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const KIE_API_SECRET_NAME = "kie_api_key";
export const KIE_WEBHOOK_HMAC_SECRET_NAME = "kie_webhook_hmac_key";

export async function getKieApiKey(admin: SupabaseClient) {
  return getAppSecret(admin, KIE_API_SECRET_NAME, "KIE_API_KEY");
}

export async function getKieWebhookHmacKey(admin: SupabaseClient) {
  return getAppSecret(admin, KIE_WEBHOOK_HMAC_SECRET_NAME, "KIE_WEBHOOK_HMAC_KEY");
}

async function getAppSecret(admin: SupabaseClient, secretName: string, fallbackEnvName: string) {
  const { data, error } = await admin.rpc("get_app_secret", {
    target_name: secretName,
  });
  if (!error && typeof data === "string" && data.trim()) return data.trim();
  return process.env[fallbackEnvName]?.trim() || null;
}

export async function putKieApiKey(admin: SupabaseClient, apiKey: string, actorId: string, reason: string) {
  return putAppSecret(admin, KIE_API_SECRET_NAME, apiKey, actorId, reason);
}

export async function deleteKieApiKey(admin: SupabaseClient, actorId: string, reason: string) {
  return deleteAppSecret(admin, KIE_API_SECRET_NAME, actorId, reason);
}

export async function putKieWebhookHmacKey(admin: SupabaseClient, hmacKey: string, actorId: string, reason: string) {
  return putAppSecret(admin, KIE_WEBHOOK_HMAC_SECRET_NAME, hmacKey, actorId, reason);
}

export async function deleteKieWebhookHmacKey(admin: SupabaseClient, actorId: string, reason: string) {
  return deleteAppSecret(admin, KIE_WEBHOOK_HMAC_SECRET_NAME, actorId, reason);
}

async function putAppSecret(admin: SupabaseClient, secretName: string, value: string, actorId: string, reason: string) {
  const { error } = await admin.rpc("put_app_secret", {
    target_name: secretName,
    target_value: value.trim(),
    target_actor: actorId,
    target_reason: reason,
  });
  if (error) throw error;
}

async function deleteAppSecret(admin: SupabaseClient, secretName: string, actorId: string, reason: string) {
  const { data, error } = await admin.rpc("delete_app_secret", {
    target_name: secretName,
    target_actor: actorId,
    target_reason: reason,
  });
  if (error) throw error;
  return Boolean(data);
}
