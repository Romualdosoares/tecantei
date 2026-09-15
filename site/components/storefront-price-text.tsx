"use client";

import { useStorefrontPrice } from "@/components/storefront-price-provider";

export function StorefrontPriceText() {
  return useStorefrontPrice().formattedPrice;
}
