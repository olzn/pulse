"use client";

import { useCallback } from "react";
import { motion } from "motion/react";
import { METRICS, type MetricId } from "@/config/metrics";
import { useMetrics } from "@/lib/hooks/use-metrics";
import { useCurrency } from "@/lib/hooks/use-currency";
import { MetricCard } from "./metric-card";
import { staggerContainer, fadeUp } from "@/lib/motion/variants";
import type { FiatRates, MetricsResponse } from "@/lib/data/types";

const FIAT_METRICS = new Set<MetricId>(["gasPrice", "tvl"]);

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
      if (metricId === "gasPrice") {
        return (v: number) => formatFiat(v, rates);
      }
      if (metricId === "tvl") {
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
          FIAT_METRICS.has(config.id) && rates
            ? makeFiatFormatter(config.id, rates)
            : undefined;
        return (
          <motion.div key={config.id} variants={fadeUp}>
            <MetricCard
              config={config}
              value={value}
              trend={trend}
              isLoading={isLoading}
              onClick={
                config.hasHistory && onSelectMetric
                  ? () => onSelectMetric(config.id)
                  : undefined
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
