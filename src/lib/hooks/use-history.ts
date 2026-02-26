"use client";

import { useQuery } from "@tanstack/react-query";
import type { HistoryResponse } from "@/lib/data/types";

async function fetchHistory(metric: string): Promise<HistoryResponse> {
  const res = await fetch(`/api/history?metric=${metric}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export function useHistory(metric: string | null) {
  return useQuery<HistoryResponse>({
    queryKey: ["history", metric],
    queryFn: () => fetchHistory(metric!),
    enabled: !!metric,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
