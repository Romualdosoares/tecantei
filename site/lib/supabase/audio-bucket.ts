import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AudioBucket } from "@/lib/music/storage-port";
import { createSupabaseAdminClient } from "./admin";
import { getSupabaseAudioBucket } from "./env";

export function createSupabaseAudioBucket(
  supabase: SupabaseClient = createSupabaseAdminClient(),
): AudioBucket {
  const storage = supabase.storage.from(getSupabaseAudioBucket());

  return {
    async put(key, value, options) {
      const body = value.slice().buffer as ArrayBuffer;
      const { error } = await storage.upload(key, body, {
        cacheControl: "private, max-age=0, no-store",
        contentType: options.httpMetadata.contentType,
        metadata: options.customMetadata,
        upsert: true,
      });
      if (error) throw new Error(`Falha no Storage Supabase: ${error.message}`);
      return { key };
    },

    async get(key) {
      const { data, error } = await storage.download(key);
      if (error) {
        if (error.message.toLowerCase().includes("not found")) return null;
        throw new Error(`Falha no Storage Supabase: ${error.message}`);
      }
      return {
        size: data.size,
        arrayBuffer: () => data.arrayBuffer(),
      };
    },
  };
}
