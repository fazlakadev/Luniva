"use client";

// Adapted from Magic UI's documented NumberTicker component:
// https://magicui.design/docs/components/number-ticker
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  delay?: number;
}

const formatter = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });

export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  className,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(startValue);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }
    const timer = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay, isInView, motionValue, reduceMotion, value]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = formatter.format(Math.round(latest));
      }),
    [springValue],
  );

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums ${className ?? ""}`}
      {...props}
    >
      {formatter.format(startValue)}
    </span>
  );
}
