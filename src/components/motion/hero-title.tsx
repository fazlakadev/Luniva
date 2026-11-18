"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function HeroTitle({
  top,
  bottom,
  className,
  bottomStyle,
}: {
  top: string;
  bottom: string;
  className?: string;
  bottomStyle?: CSSProperties;
}) {
  const reduceMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: 0.05 },
    },
  };

  const line = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <motion.h1 className={className} variants={container} initial="hidden" animate="show">
      <motion.span className="block" variants={line}>{top}</motion.span>
      <motion.span className="mt-1 block" style={bottomStyle} variants={line}>{bottom}</motion.span>
    </motion.h1>
  );
}
