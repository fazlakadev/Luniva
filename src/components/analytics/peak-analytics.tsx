"use client";

// Responsive, RTL-safe wrapper around the supplied PeakChart.
// Props are serialisable so the dashboard pages can stay Server Components.

import * as React from "react";
import { useReducedMotion } from "motion/react";
import PeakChart from "@/components/ui/peak-chart";
import { formatMoney } from "@/lib/format";

export type PeakAnalyticsSeries = {
  period: string;
  labels: string[];
  data: number[];
  value: number;
};

export type PeakAnalyticsProps = {
  series: PeakAnalyticsSeries[];
  title: string;
  caption: string;
  updatedText: string;
  valueSuffix?: string;
  trend?: "up" | "down" | "none";
  accent?: string;
  className?: string;
};

const MIN_WIDTH = 240;
const MAX_WIDTH = 420;

export default function PeakAnalytics({
  series,
  title,
  caption,
  updatedText,
  valueSuffix = "ج.م",
  trend = "none",
  accent = "#5c498f",
  className,
}: PeakAnalyticsProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const [width, setWidth] = React.useState(MAX_WIDTH);
  const hostRef = React.useRef<HTMLDivElement>(null);

  // The chart takes an explicit pixel width; measure the card so it never
  // overflows the RTL dashboard at 375 / 800 / 1200px viewports.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const available = host.clientWidth;
      if (available > 0) {
        setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(available))));
      }
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const periods = React.useMemo(() => series.map((entry) => entry.period), [series]);
  const handlePeriodChange = React.useCallback(
    (period: string) => {
      const index = series.findIndex((entry) => entry.period === period);
      if (index >= 0) setActive(index);
    },
    [series],
  );
  const formatValue = React.useCallback((value: number) => formatMoney(value), []);

  const selected = series[active] ?? series[0];
  if (!selected) return null;

  const data = selected.data.length ? selected.data : [0];
  const labels = selected.labels.length ? selected.labels : [""];

  return (
    <div
      ref={hostRef}
      dir="ltr"
      className={className}
      style={{ width: "100%", maxWidth: MAX_WIDTH, marginInline: "auto", overflow: "hidden" }}
    >
      <PeakChart
        data={data}
        labels={labels}
        value={selected.value}
        valueSuffix={valueSuffix}
        title={title}
        caption={caption}
        updatedText={updatedText}
        trend={trend}
        periods={periods.length ? periods : [selected.period]}
        period={selected.period}
        onPeriodChange={handlePeriodChange}
        accent={accent}
        width={width}
        loop={reduceMotion ? 0 : 12}
        backdrop={false}
        formatValue={formatValue}
        font='"Segoe UI", Tahoma, Arial, sans-serif'
      />
    </div>
  );
}
