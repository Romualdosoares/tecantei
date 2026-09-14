"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const DEFAULT_PRICE_CENTS = 1_990;
type StorefrontPriceValue = {
  productPriceCents: number;
  formattedPrice: string;
  refreshPrice: () => Promise<void>;
};

const StorefrontPriceContext = createContext<StorefrontPriceValue>({
  productPriceCents: DEFAULT_PRICE_CENTS,
  formattedPrice: formatBrl(DEFAULT_PRICE_CENTS),
  refreshPrice: async () => {},
});

export function StorefrontPriceProvider({ children }: { children: React.ReactNode }) {
  const [productPriceCents, setProductPriceCents] = useState(DEFAULT_PRICE_CENTS);
  const refreshPrice = useCallback(async () => {
    const response = await fetch("/api/storefront/config", { cache: "no-store" }).catch(() => null);
    const payload = response?.ok ? await response.json().catch(() => null) as { productPriceCents?: number } | null : null;
    if (Number.isInteger(payload?.productPriceCents) && Number(payload?.productPriceCents) >= 100) {
      setProductPriceCents(Number(payload?.productPriceCents));
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshPrice(), 0);
    const timer = window.setInterval(() => void refreshPrice(), 15_000);
    const onFocus = () => void refreshPrice();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshPrice]);

  const value = useMemo(() => ({
    productPriceCents,
    formattedPrice: formatBrl(productPriceCents),
    refreshPrice,
  }), [productPriceCents, refreshPrice]);
  return <StorefrontPriceContext.Provider value={value}>{children}</StorefrontPriceContext.Provider>;
}

export function useStorefrontPrice() {
  return useContext(StorefrontPriceContext);
}

export function formatBrl(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
