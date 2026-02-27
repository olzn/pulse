"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
}

export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const spring = useSpring(value, {
    stiffness: 80,
    damping: 20,
    mass: 0.5,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (v) => format(v));

  return (
    <motion.span className="tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </motion.span>
  );
}
