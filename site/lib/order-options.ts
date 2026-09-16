export const MUSIC_STYLE_OPTIONS = [
  "Sertanejo Universitário",
  "Sertanejo romântico",
  "Piseiro",
  "Pagode animado",
  "Pagode romântico",
  "Funk",
  "Funk ostentação",
  "Funknejo",
  "Acústico",
  "Gospel",
  "Pop",
  "Pop romântico",
  "MPB",
  "Romântico",
  "Motivacional",
  "Motivacional impactante",
  "Trap",
  "Trap Gospel",
  "Outro",
] as const;

export const VOICE_OPTIONS = [
  { value: "masculina", label: "Voz masculina" },
  { value: "feminina", label: "Voz feminina" },
] as const;

export type VoicePreference = (typeof VOICE_OPTIONS)[number]["value"];

export function musicStyleWithVoice(style: string, voice: VoicePreference) {
  return `${style.trim()}. Voz ${voice}`;
}
