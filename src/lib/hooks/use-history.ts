"use client";

import { useQuery } from "@tanstack/react-query";
import type { Timeframe } from "@/config/metrics";
import type { HistoryResponse } from "@/lib/data/types";

async function fetchHistory(metric: string, timeframe: string): Promise<HistoryResponse> {
  const res = await fetch(`/api/history?metric=${metric}&timeframe=${timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export function useHistory(metric: string | null, timeframe: Timeframe) {
  const isShortRange = timeframe === "1h" || timeframe === "24h";

  return useQuery<HistoryResponse>({
    queryKey: ["history", metric, timeframe],
    queryFn: () => fetchHistory(metric as string, timeframe),
    enabled: !!metric && timeframe !== "live",
    staleTime: isShortRange ? 30_000 : 60_000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: isShortRange ? 30_000 : 60_000,
  });
}
