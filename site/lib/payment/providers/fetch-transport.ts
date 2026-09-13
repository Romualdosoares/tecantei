import type { ProviderHttpTransport } from "./types.ts";

const MAX_RESPONSE_BYTES = 1_048_576;

export const fetchProviderTransport: ProviderHttpTransport = async (request) => {
  if (request.tls) throw new Error("O transporte fetch não aceita certificado mTLS da Efí.");
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const bodyText = await response.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("Resposta do provedor excedeu 1 MiB.");
  }
  let body: unknown = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new Error("Resposta JSON inválida do provedor.");
    }
  }
  return { status: response.status, body };
};
