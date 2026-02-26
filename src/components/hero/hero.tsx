"use client";

import { useMetrics } from "@/lib/hooks/use-metrics";
import { useCurrency } from "@/lib/hooks/use-currency";
import { StatusDot } from "./status-dot";
import { Skeleton } from "@/components/ui/skeleton";

const statusMessages = {
  healthy: "Gnosis Chain is running smoothly.",
  degraded: "Gnosis Chain is experiencing minor issues.",
  down: "Gnosis Chain may be experiencing problems.",
};

export function Hero() {
  const { data, isLoading } = useMetrics();
  const { formatFiat } = useCurrency();

  if (isLoading || !data) {
    return (
      <div className="mb-12">
        <Skeleton className="mb-3 h-8 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
    );
  }

  const { status } = data;
  const fiatCost = data.metrics.gasPrice.fiatCost;

  let subtitle: string;
  if (status === "degraded") {
    subtitle = "Some metrics are outside normal ranges.";
  } else if (status === "down") {
    subtitle = "Data sources may be unavailable.";
  } else if (fiatCost < 0.01) {
    subtitle = "Transactions cost less than a penny.";
  } else {
    subtitle = `Transactions cost about ${formatFiat(fiatCost, data.fiatRates)}.`;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3">
        <StatusDot status={status} />
        <h1 className="text-[2rem] font-semibold leading-tight text-content-primary">
          {statusMessages[status]}
        </h1>
      </div>
      <p className="mt-2 text-lg text-content-secondary">
        {subtitle}
      </p>
    </div>
  );
}
