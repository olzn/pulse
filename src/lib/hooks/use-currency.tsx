"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import type { FiatCurrency, FiatRates } from "@/lib/data/types";

interface CurrencyContextValue {
  currency: FiatCurrency;
  setCurrency: (c: FiatCurrency) => void;
  convert: (usdValue: number, rates: FiatRates) => number;
  formatFiat: (usdValue: number, rates: FiatRates) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function detectCurrency(): FiatCurrency {
  if (typeof navigator === "undefined") return "USD";

  const locale = navigator.language || "en-US";
  const region = locale.split("-")[1]?.toUpperCase();

  const regionMap: Record<string, FiatCurrency> = {
    GB: "GBP",
    US: "USD",
    DE: "EUR",
    FR: "EUR",
    ES: "EUR",
    IT: "EUR",
    NL: "EUR",
    AT: "EUR",
    BE: "EUR",
    IE: "EUR",
    PT: "EUR",
  };

  return regionMap[region ?? ""] || "USD";
}

const currencySymbols: Record<FiatCurrency, string> = {
  USD: "$",
  GBP: "\u00A3",
  EUR: "\u20AC",
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<FiatCurrency>(detectCurrency);

  const convert = useCallback(
    (usdValue: number, rates: FiatRates): number => {
      const key = currency.toLowerCase() as keyof FiatRates;
      return usdValue * (rates[key] || 1);
    },
    [currency],
  );

  const formatFiat = useCallback(
    (usdValue: number, rates: FiatRates): string => {
      const converted = convert(usdValue, rates);

      if (converted < 0.01) {
        return `< ${currencySymbols[currency]}0.01`;
      }

      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: converted >= 1_000_000 ? "compact" : "standard",
        maximumFractionDigits: converted >= 1000 ? 1 : 2,
      }).format(converted);
    },
    [currency, convert],
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convert,
        formatFiat,
        symbol: currencySymbols[currency],
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
