"use client";

import { Liveline } from "liveline";
import { useCallback, useMemo } from "react";
import {
  METRICS,
  TIMEFRAME_LABELS,
  TIMEFRAME_SECS,
  type MetricId,
  type Timeframe,
} from "@/config/metrics";
import { useHistory } from "@/lib/hooks/use-history";
import { useLiveChart } from "@/lib/hooks/use-live-chart";
import { ChartToggle } from "./chart-toggle";

function makeFormatTime(timeframe: Timeframe): (t: number) => string {
  return (t: number) => {
    const d = new Date(t * 1000);
    switch (timeframe) {
      case "live":
        return d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      case "1h":
      case "24h":
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      case "7d":
        return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" });
      case "1mo":
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      case "1yr":
      case "all":
        return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
  };
}

interface HistoryChartProps {
  selectedMetric: MetricId;
  onSelectMetric: (id: MetricId) => void;
  selectedTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
}

export function HistoryChart({
  selectedMetric,
  onSelectMetric,
  selectedTimeframe,
  onSelectTimeframe,
}: HistoryChartProps) {
  const isLive = selectedTimeframe === "live";

  // Historical data (disabled when live)
  const { data, isLoading } = useHistory(selectedMetric, selectedTimeframe);

  // Live data (disabled when not live)
  const { points: livePoints, latestValue: liveLatestValue } = useLiveChart(selectedMetric, isLive);

  const config = METRICS.find((m) => m.id === selectedMetric);

  // Build Liveline windows array from metric timeframes
  const windows = useMemo(() => {
    if (!config) return [];
    return config.timeframes.map((tf) => ({
      label: TIMEFRAME_LABELS[tf],
      secs: TIMEFRAME_SECS[tf],
    }));
  }, [config]);

  // Reverse lookup: secs → Timeframe
  const handleWindowChange = useCallback(
    (secs: number) => {
      if (!config) return;
      const tf = config.timeframes.find((t) => TIMEFRAME_SECS[t] === secs);
      if (tf) onSelectTimeframe(tf);
    },
    [config, onSelectTimeframe],
  );

  // Historical chart data
  const chartData = useMemo(() => {
    if (isLive) return [];
    if (!data?.points.length) return [];
    return data.points.map((p) => ({
      time: new Date(p.timestamp).getTime() / 1000,
      value: p.value,
    }));
  }, [data, isLive]);

  // Determine which data to render
  const displayData = isLive ? livePoints : chartData;
  const latestValue = isLive
    ? liveLatestValue
    : chartData.length > 0
      ? chartData[chartData.length - 1].value
      : 0;

  const liveWaiting = isLive && displayData.length === 0;

  const formatTime = useMemo(() => makeFormatTime(selectedTimeframe), [selectedTimeframe]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-content-secondary">
          {isLive ? "Live feed" : "Historical trend"}
        </h2>
        <ChartToggle selected={selectedMetric} onSelect={onSelectMetric} />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
        <div style={{ height: 192 }}>
          <Liveline
            key={selectedMetric}
            data={displayData}
            value={latestValue}
            window={TIMEFRAME_SECS[selectedTimeframe]}
            color="#3d8b7a"
            fill
            grid
            badge={isLive}
            momentum={isLive}
            scrub
            loading={!isLive && isLoading}
            emptyText={liveWaiting ? "Collecting live data…" : "Not enough data yet."}
            windows={windows}
            onWindowChange={handleWindowChange}
            windowStyle="rounded"
            theme="light"
            formatValue={config?.format}
            formatTime={formatTime}
            lerpSpeed={isLive ? 0.15 : 0.08}
            style={{ height: 192 }}
          />
        </div>
      </div>
    </div>
  );
}
