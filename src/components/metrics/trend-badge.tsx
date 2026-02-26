import { cn } from "@/lib/utils/cn";

interface TrendBadgeProps {
  value: number | null;
  invertSentiment?: boolean;
}

export function TrendBadge({ value, invertSentiment = false }: TrendBadgeProps) {
  if (value === null || value === 0) return null;

  const isPositive = invertSentiment ? value < 0 : value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isPositive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700",
      )}
    >
      {value > 0 ? "\u25B2" : "\u25BC"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
