"use client";

// Adapted from Magic UI's documented BlurFade component:
// https://magicui.design/docs/components/blur-fade
import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  type MotionProps,
  type UseInViewOptions,
  type Variants,
} from "motion/react";

type MarginType = UseInViewOptions["margin"];

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  inView?: boolean;
  inViewMargin?: MarginType;
  blur?: string;
}

function getFilter(value: Variants[string]) {
  return typeof value === "function" ? undefined : value.filter;
}

export function BlurFade({
  children,
  className,
  duration = 0.55,
  delay = 0,
  offset = 8,
  direction = "up",
  inView = false,
  inViewMargin = "-40px",
  blur = "6px",
  ...props
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  const reduceMotion = useReducedMotion();

  const activeOffset = reduceMotion ? 0 : offset;
  const activeBlur = reduceMotion ? "0px" : blur;
  const activeDuration = reduceMotion ? 0 : duration;

  const variants: Variants = {
    hidden: {
      [direction === "left" || direction === "right" ? "x" : "y"]:
        direction === "right" || direction === "down" ? -activeOffset : activeOffset,
      opacity: 0,
      filter: `blur(${activeBlur})`,
    },
    visible: {
      [direction === "left" || direction === "right" ? "x" : "y"]: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
  };

  const hiddenFilter = getFilter(variants.hidden);
  const visibleFilter = getFilter(variants.visible);
  const shouldTransitionFilter =
    hiddenFilter !== undefined &&
    visibleFilter !== undefined &&
    hiddenFilter !== visibleFilter;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={variants}
        transition={{
          delay: reduceMotion ? 0 : 0.04 + delay,
          duration: activeDuration,
          ease: "easeOut",
          ...(shouldTransitionFilter ? { filter: { duration: activeDuration } } : {}),
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
