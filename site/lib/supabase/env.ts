export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function normalize(value: string | undefined) {
  return value?.trim() || null;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = normalize(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!url && !publishableKey) return null;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase incompleto: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em conjunto.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve usar HTTPS fora do ambiente local.");
  }

  return { url: parsed.toString().replace(/\/$/, ""), publishableKey };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env.local e informe as chaves do ambiente.",
    );
  }
  return config;
}

export function requireSupabaseSecretKey() {
  const secretKey = normalize(process.env.SUPABASE_SECRET_KEY);
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY não configurada no servidor.");
  }
  return secretKey;
}

export function getSupabaseAudioBucket() {
  return normalize(process.env.SUPABASE_AUDIO_BUCKET) ?? "te-cantei-audio";
}
