import { EfiPixApiError } from "./providers/efi.ts";
import { MercadoPagoApiError } from "./providers/mercado-pago.ts";
import type { PixPaymentProvider } from "./providers/types.ts";

type Wait = (milliseconds: number) => Promise<void>;

type RetryOptions = {
  wait?: Wait;
};

const wait: Wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function getPixChargeWithRetry(
  provider: Pick<PixPaymentProvider, "getPixCharge">,
  externalId: string,
  options: RetryOptions = {},
) {
  try {
    return await provider.getPixCharge(externalId);
  } catch (error) {
    if (!isRetryablePixLookupError(error)) throw error;
    await (options.wait ?? wait)(250);
    return provider.getPixCharge(externalId);
  }
}

export function isRetryablePixLookupError(error: unknown) {
  if (error instanceof EfiPixApiError || error instanceof MercadoPagoApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  if (!(error instanceof Error)) return false;
  return /timeout|timed out|econnreset|econnrefused|eai_again|socket hang up/i.test(error.message);
}
