"use client";

import { TIMEFRAME_LABELS, type Timeframe } from "@/config/metrics";
import { cn } from "@/lib/utils/cn";

interface TimeframeToggleProps {
  timeframes: Timeframe[];
  selected: Timeframe;
  onSelect: (tf: Timeframe) => void;
}

export function TimeframeToggle({ timeframes, selected, onSelect }: TimeframeToggleProps) {
  return (
    <div className="flex items-center gap-1">
      {timeframes.map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => onSelect(tf)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            selected === tf
              ? "bg-accent text-white"
              : "bg-surface-elevated text-content-secondary hover:text-content-primary",
          )}
        >
          {TIMEFRAME_LABELS[tf]}
        </button>
      ))}
    </div>
  );
}
