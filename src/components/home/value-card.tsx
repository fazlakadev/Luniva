"use client";

import { BadgePercent, Palette, Ruler, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export type ValueIcon = "palette" | "ruler" | "badge-percent" | "shield-check";

const ICONS = {
  "badge-percent": BadgePercent,
  palette: Palette,
  ruler: Ruler,
  "shield-check": ShieldCheck,
} as const;

export default function ValueCard({
  icon,
  title,
  description,
  tone,
  className = "",
}: {
  icon: ValueIcon;
  title: string;
  description: string;
  tone: "brand" | "lav" | "success" | "warning";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = ICONS[icon];
  const soft = `var(--${tone}-soft)`;
  const strong = `var(--${tone}-strong, var(--${tone}))`;

  return (
    <motion.article
      className={`group relative flex h-full min-h-[13rem] flex-col justify-between overflow-hidden rounded-[1.6rem] border p-5 sm:p-6 ${className}`}
      style={{
        borderColor: "var(--line)",
        background: "color-mix(in srgb, var(--surface) 86%, transparent)",
        boxShadow: "var(--shadow-sm)",
      }}
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: soft }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
          style={{ background: soft, color: strong }}
        >
          <Icon size={21} />
        </span>
        <span className="text-[10px] font-black" style={{ color: "var(--muted-2)" }}>
          لونيفا
        </span>
      </div>
      <div className="relative mt-6">
        <h3 className="text-base font-black" style={{ color: "var(--ink)" }}>{title}</h3>
        <p className="mt-2 text-xs leading-6 muted">{description}</p>
      </div>
    </motion.article>
  );
}
