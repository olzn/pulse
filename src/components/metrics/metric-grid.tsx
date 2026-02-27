"use client";

import { motion } from "motion/react";
import { useCallback } from "react";
import { hasChart, METRICS, type MetricId } from "@/config/metrics";
import type { FiatRates, MetricsResponse } from "@/lib/data/types";
import { useCurrency } from "@/lib/hooks/use-currency";
import { useMetrics } from "@/lib/hooks/use-metrics";
import { fadeUp, staggerContainer } from "@/lib/motion/variants";
import { MetricCard } from "./metric-card";

const FIAT_METRICS = new Set<MetricId>(["gasPrice", "tvl", "gnoPrice"]);

function getMetricValue(
  metrics: MetricsResponse | undefined,
  id: string,
): { value: number | undefined; trend: number | null | undefined } {
  if (!metrics?.metrics) return { value: undefined, trend: undefined };

  const m = metrics.metrics;
  switch (id) {
    case "gasPrice":
      return { value: m.gasPrice.fiatCost, trend: m.gasPrice.trend7d };
    case "transactions24h":
      return { value: m.transactions24h.count, trend: m.transactions24h.trend7d };
    case "blockTime":
      return { value: m.blockTime.averageSeconds, trend: null };
    case "validators":
      return { value: m.validators.active, trend: m.validators.trend7d };
    case "tvl":
      return { value: m.tvl.totalUsd, trend: m.tvl.trend30d };
    case "gnoPrice":
      return { value: m.gnoPrice.usd, trend: m.gnoPrice.trend24h };
    default:
      return { value: undefined, trend: undefined };
  }
}

interface MetricGridProps {
  selectedMetric?: MetricId;
  onSelectMetric?: (id: MetricId) => void;
}

export function MetricGrid({ selectedMetric, onSelectMetric }: MetricGridProps) {
  const { data, isLoading } = useMetrics();
  const { formatFiat } = useCurrency();

  const rates = data?.fiatRates;

  const makeFiatFormatter = useCallback(
    (metricId: MetricId, rates: FiatRates) => {
      if (metricId === "gasPrice" || metricId === "tvl" || metricId === "gnoPrice") {
        return (v: number) => formatFiat(v, rates);
      }
      return undefined;
    },
    [formatFiat],
  );

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {METRICS.map((config) => {
        const { value, trend } = getMetricValue(data, config.id);
        const formatOverride =
          FIAT_METRICS.has(config.id) && rates ? makeFiatFormatter(config.id, rates) : undefined;
        return (
          <motion.div key={config.id} variants={fadeUp}>
            <MetricCard
              config={config}
              value={value}
              trend={trend}
              isLoading={isLoading}
              onClick={
                hasChart(config) && onSelectMetric ? () => onSelectMetric(config.id) : undefined
              }
              isSelected={selectedMetric === config.id}
              formatOverride={formatOverride}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
