"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function AmbientGlow({
  className,
  style,
  delay = 0,
  duration = 14,
}: {
  className?: string;
  style?: CSSProperties;
  delay?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={style}
      initial={false}
      animate={
        reduceMotion
          ? undefined
          : {
              scale: [1, 1.12, 1],
              x: [0, -10, 0],
              y: [0, 10, 0],
              opacity: [0.55, 0.78, 0.55],
            }
      }
      transition={{
        duration,
        delay,
        repeat: reduceMotion ? 0 : Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
