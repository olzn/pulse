"use client";

import { AnimatePresence, motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetricConfig } from "@/config/metrics";
import { AnimatedNumber } from "./animated-number";
import { Explainer } from "./explainer";
import { TrendBadge } from "./trend-badge";

interface MetricCardProps {
  config: MetricConfig;
  value: number | undefined;
  trend: number | null | undefined;
  isLoading: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  formatOverride?: (v: number) => string;
}

export function MetricCard({
  config,
  value,
  trend,
  isLoading,
  onClick,
  isSelected,
  formatOverride,
}: MetricCardProps) {
  const trendLabel = config.trendPeriod === "30d" ? "vs last month" : "vs last week";

  return (
    <motion.div
      className={`h-full rounded-2xl border bg-surface-card p-5 ${
        isSelected ? "border-accent/40 ring-1 ring-accent/20" : "border-border-subtle"
      } ${onClick ? "cursor-pointer" : ""}`}
      whileHover={{ y: -1, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }}>
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-start justify-between">
              <p className="text-sm text-content-secondary">{config.label}</p>
              <Explainer text={config.explainer} />
            </div>
            <div className="mt-2 text-[1.75rem] font-semibold leading-none text-content-primary">
              <AnimatedNumber value={value ?? 0} format={formatOverride ?? config.format} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {trend !== undefined && (
                <TrendBadge value={trend} invertSentiment={config.invertSentiment} />
              )}
              {trend !== undefined && trend !== null && (
                <span className="text-xs text-content-tertiary">{trendLabel}</span>
              )}
            </div>
            <p className="mt-3 text-xs text-content-tertiary">{config.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
