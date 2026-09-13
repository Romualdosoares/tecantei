import { Buffer } from "node:buffer";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export async function hashShareToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
