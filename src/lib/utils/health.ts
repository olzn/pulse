import type { MetricsResponse } from "@/lib/data/types";

/**
 * Derive overall chain health status from current metrics.
 * Checks block time deviation, gas price spike, and validator count.
 */
export function deriveStatus(metrics: MetricsResponse["metrics"]): "healthy" | "degraded" | "down" {
  const checks = [
    metrics.blockTime.deviationPercent < 20,
    metrics.gasPrice.current < 100,
    metrics.validators.active > 100 || metrics.validators.active === 0, // 0 = not yet fetched
  ];

  const passing = checks.filter(Boolean).length;
  if (passing === checks.length) return "healthy";
  if (passing >= checks.length - 1) return "degraded";
  return "down";
}
