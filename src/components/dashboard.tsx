"use client";

import { useState } from "react";
import type { MetricId } from "@/config/metrics";
import { MetricGrid } from "./metrics/metric-grid";
import { HistoryChart } from "./chart/history-chart";

export function Dashboard() {
  const [selectedMetric, setSelectedMetric] = useState<MetricId>("transactions24h");

  return (
    <>
      <MetricGrid
        selectedMetric={selectedMetric}
        onSelectMetric={setSelectedMetric}
      />
      <div className="mt-8">
        <HistoryChart
          selectedMetric={selectedMetric}
          onSelectMetric={setSelectedMetric}
        />
      </div>
    </>
  );
}
