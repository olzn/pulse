"use client";

import { hasChart, METRICS, type MetricId } from "@/config/metrics";
import { cn } from "@/lib/utils/cn";

interface ChartToggleProps {
  selected: MetricId;
  onSelect: (id: MetricId) => void;
}

const chartableMetrics = METRICS.filter(hasChart);

export function ChartToggle({ selected, onSelect }: ChartToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chartableMetrics.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selected === m.id
              ? "bg-accent text-white"
              : "bg-surface-elevated text-content-secondary hover:text-content-primary",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
