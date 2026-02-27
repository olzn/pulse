"use client";

import { useEffect, useState } from "react";
import { defaultTimeframe, METRICS, type MetricId, type Timeframe } from "@/config/metrics";
import { HistoryChart } from "./chart/history-chart";
import { MetricGrid } from "./metrics/metric-grid";

export function Dashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricId>("transactions24h");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("7d");

  // Reset timeframe when metric changes
  useEffect(() => {
    const config = METRICS.find((m) => m.id === selectedMetric);
    if (config) {
      setSelectedTimeframe(defaultTimeframe(config));
    }
  }, [selectedMetric]);

  return (
    <>
      <MetricGrid selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
      <div className="mt-8">
        <HistoryChart
          selectedMetric={selectedMetric}
          onSelectMetric={setSelectedMetric}
          selectedTimeframe={selectedTimeframe}
          onSelectTimeframe={setSelectedTimeframe}
        />
      </div>
    </>
  );
}
