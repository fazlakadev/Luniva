"use client";

import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

export default function MagneticLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 22, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 22, mass: 0.4 });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * 0.16);
    y.set((event.clientY - (rect.top + rect.height / 2)) * 0.16);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className="inline-flex max-w-full"
      style={{ x: reduceMotion ? 0 : springX, y: reduceMotion ? 0 : springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <Link href={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    </motion.div>
  );
}
