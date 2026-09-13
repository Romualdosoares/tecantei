export async function verifyKieWebhook(input: {
  taskId: string;
  timestamp: string;
  signature: string;
  hmacKey: string;
  nowSeconds?: number;
  maxAgeSeconds?: number;
}) {
  const timestamp = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
  const maxAge = input.maxAgeSeconds ?? 300;

  if (
    !Number.isInteger(timestamp) ||
    !input.taskId ||
    !input.hmacKey ||
    Math.abs(now - timestamp) > maxAge
  ) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(input.hmacKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${input.taskId}.${input.timestamp}`),
  );
  const expected = new Uint8Array(digest);
  const received = decodeBase64(input.signature);
  if (!received) return false;

  let difference = expected.length ^ received.length;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index] ^ (received[index] ?? 0);
  }
  return difference === 0;
}

function decodeBase64(value: string) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}
