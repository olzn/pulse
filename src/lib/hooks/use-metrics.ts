"use client";

import { useQuery } from "@tanstack/react-query";
import type { MetricsResponse } from "@/lib/data/types";

async function fetchMetricsClient(): Promise<MetricsResponse> {
  const res = await fetch("/api/metrics");
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export function useMetrics() {
  return useQuery<MetricsResponse>({
    queryKey: ["metrics"],
    queryFn: fetchMetricsClient,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
