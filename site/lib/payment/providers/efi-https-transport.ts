import { request as httpsRequest } from "node:https";
import type { ProviderHttpTransport } from "./types.ts";

const MAX_RESPONSE_BYTES = 1_048_576;

export const efiHttpsTransport: ProviderHttpTransport = (request) => new Promise((resolve, reject) => {
  if (!request.tls?.pfxBase64) {
    reject(new Error("Certificado mTLS da Efí ausente."));
    return;
  }
  const url = new URL(request.url);
  if (url.protocol !== "https:" || !["pix.api.efipay.com.br", "pix-h.api.efipay.com.br"].includes(url.hostname)) {
    reject(new Error("Destino Efí não autorizado."));
    return;
  }

  const outgoing = httpsRequest(url, {
    method: request.method,
    headers: request.headers,
    pfx: Buffer.from(request.tls.pfxBase64, "base64"),
    passphrase: request.tls.passphrase,
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
    timeout: 15_000,
  }, (response) => {
    const chunks: Buffer[] = [];
    let total = 0;
    response.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_RESPONSE_BYTES) {
        outgoing.destroy(new Error("Resposta da Efí excedeu 1 MiB."));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      try {
        resolve({ status: response.statusCode ?? 0, body: text ? JSON.parse(text) : null });
      } catch {
        reject(new Error("Resposta JSON inválida da Efí."));
      }
    });
  });
  outgoing.on("timeout", () => outgoing.destroy(new Error("Timeout na API Efí.")));
  outgoing.on("error", reject);
  if (request.body) outgoing.write(request.body);
  outgoing.end();
});
