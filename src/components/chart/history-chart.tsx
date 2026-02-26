"use client";

import { useMemo } from "react";
import { Liveline } from "liveline";
import { useHistory } from "@/lib/hooks/use-history";
import { ChartToggle } from "./chart-toggle";
import { METRICS, type MetricId } from "@/config/metrics";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(t: number): string {
  const d = new Date(t * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface HistoryChartProps {
  selectedMetric: MetricId;
  onSelectMetric: (id: MetricId) => void;
}

export function HistoryChart({ selectedMetric, onSelectMetric }: HistoryChartProps) {
  const { data, isLoading } = useHistory(selectedMetric);

  const config = METRICS.find((m) => m.id === selectedMetric);

  const chartData = useMemo(() => {
    if (!data?.points.length) return [];
    return data.points.map((p) => ({
      time: new Date(p.timestamp).getTime() / 1000, // Liveline expects seconds
      value: p.value,
    }));
  }, [data]);

  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const hasData = chartData.length > 0;
  const noDataAvailable = !isLoading && data && !hasData;

  // Compute window to cover the full data range (in seconds)
  const windowSecs = useMemo(() => {
    if (chartData.length < 2) return 30;
    const oldest = chartData[0].time;
    const newest = chartData[chartData.length - 1].time;
    // Add 5% padding on each side
    return Math.ceil((newest - oldest) * 1.1);
  }, [chartData]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-content-secondary">
          Historical trend
        </h2>
        <ChartToggle selected={selectedMetric} onSelect={onSelectMetric} />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : noDataAvailable ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-content-tertiary">
              Not enough data yet for this metric.
            </p>
          </div>
        ) : (
          <div style={{ height: 192 }}>
            <Liveline
              key={selectedMetric}
              data={chartData}
              value={latestValue}
              window={windowSecs}
              color="#3d8b7a"
              fill
              grid={false}
              badge={false}
              momentum={false}
              scrub
              theme="light"
              formatValue={config?.format}
              formatTime={formatDate}
              lerpSpeed={0.08}
              style={{ height: 192 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
