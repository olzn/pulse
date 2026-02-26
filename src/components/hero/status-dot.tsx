"use client";

import { motion } from "motion/react";

const statusColors = {
  healthy: "var(--status-healthy)",
  degraded: "var(--status-degraded)",
  down: "var(--status-down)",
};

interface StatusDotProps {
  status: "healthy" | "degraded" | "down";
}

export function StatusDot({ status }: StatusDotProps) {
  return (
    <motion.div
      className="h-3 w-3 rounded-full"
      style={{ backgroundColor: statusColors[status] }}
      animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    />
  );
}
