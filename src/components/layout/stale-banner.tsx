"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMetrics } from "@/lib/hooks/use-metrics";
import { timeAgo } from "@/lib/utils/format";

export function StaleBanner() {
  const { data } = useMetrics();
  const isStale = data?.meta.stale ?? false;

  return (
    <AnimatePresence>
      {isStale && data && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-amber-50 text-center text-sm text-amber-800"
        >
          <div className="py-2 px-4">
            Data may be delayed. Last updated {timeAgo(data.meta.lastUpdated)}.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
