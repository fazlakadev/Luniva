"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A quiet handoff from the dark hero into the light catalogue sections. */
export default function SectionDivider() {
  const reduce = useReducedMotion();

  return (
    <div className="section-divider" aria-hidden="true">
      <motion.div
        className="section-divider__inner"
        initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={reduce ? { duration: 0.2 } : { duration: 0.85, ease: EASE }}
      >
        <span className="section-divider__line" />
        <span className="section-divider__label">اكتشفي التشكيلة</span>
        <motion.span
          className="section-divider__chevron"
          animate={reduce ? undefined : { y: [0, 5, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={16} strokeWidth={1.8} />
        </motion.span>
        <span className="section-divider__line" />
      </motion.div>
    </div>
  );
}
