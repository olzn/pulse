"use client";

import { useCurrency } from "@/lib/hooks/use-currency";
import { cn } from "@/lib/utils/cn";
import type { FiatCurrency } from "@/lib/data/types";

const currencies: FiatCurrency[] = ["USD", "GBP", "EUR"];

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-surface-elevated p-0.5">
      {currencies.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            currency === c
              ? "bg-surface-card text-content-primary shadow-sm"
              : "text-content-tertiary hover:text-content-secondary",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
