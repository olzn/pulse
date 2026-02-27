"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { MetricId } from "@/config/metrics";
import type { MetricsResponse } from "@/lib/data/types";

interface LivePoint {
  time: number; // unix seconds
  value: number;
}

function extractMetricValue(data: MetricsResponse, metricId: MetricId): number | null {
  const m = data.metrics;
  switch (metricId) {
    case "gasPrice":
      return m.gasPrice.fiatCost;
    case "transactions24h":
      return m.transactions24h.count;
    case "blockTime":
      return m.blockTime.averageSeconds;
    case "validators":
      return m.validators.active;
    case "tvl":
      return m.tvl.totalUsd;
    case "gnoPrice":
      return m.gnoPrice.usd;
    default:
      return null;
  }
}

export function useLiveChart(metricId: MetricId, enabled: boolean) {
  const pointsRef = useRef<LivePoint[]>([]);
  const [tick, setTick] = useState(0);

  // 5-second polling of /api/metrics for live chart
  const { data } = useQuery<MetricsResponse>({
    queryKey: ["metrics-live"],
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });

  // Accumulate points
  useEffect(() => {
    if (!enabled || !data) return;
    const value = extractMetricValue(data, metricId);
    if (value === null) return;

    const now = Math.floor(Date.now() / 1000);
    const points = pointsRef.current;

    // Avoid duplicate timestamps
    if (points.length > 0 && points[points.length - 1].time === now) return;

    points.push({ time: now, value });

    // Cap at 720 points (1 hour of 5s intervals)
    if (points.length > 720) points.shift();

    // Trigger re-render so chart sees new data
    setTick((t) => t + 1);
  }, [data, metricId, enabled]);

  // Reset points when metric changes
  const prevMetricRef = useRef(metricId);
  if (prevMetricRef.current !== metricId) {
    prevMetricRef.current = metricId;
    pointsRef.current = [];
  }

  return {
    points: pointsRef.current,
    latestValue: data ? (extractMetricValue(data, metricId) ?? 0) : 0,
    tick,
  };
}
