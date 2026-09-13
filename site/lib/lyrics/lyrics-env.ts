import "server-only";

export function requireMockLyricsMode() {
  const mode = process.env.LYRICS_GENERATION_MODE?.trim() || "mock";
  if (mode !== "mock") {
    throw new Error("A criação real de letra ainda não possui provedor configurado.");
  }
  return mode;
}

