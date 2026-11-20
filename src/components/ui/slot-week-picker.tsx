"use client";

import * as React from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Ban,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Hourglass,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Slot {
  /** ISO timestamp, any offset. */
  start: string;
  /** Set this and the slot is shown as taken, with the reason on hover and focus. */
  unavailableReason?: string;
}

export interface SlotWeekPickerProps {
  slots: Slot[];
  /** IANA zone used to display everything, e.g. "Africa/Cairo". Default: the visitor's zone. */
  timeZone?: string;
  /** Length of one slot in minutes. Default 30. */
  slotMinutes?: number;
  /** Slots that begin sooner than this are blocked with a reason. Default 2. */
  minNoticeHours?: number;
  /** Override "now" (handy for tests and demos). */
  now?: Date | string;
  title?: string;
  onChange?: (slot: Slot | null) => void;
  onConfirm?: (slot: Slot) => Promise<void> | void;
  className?: string;
}

const DAY = 86_400_000;

const keyOf = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const addDays = (key: string, n: number) =>
  keyOf(new Date(new Date(key + "T12:00:00Z").getTime() + n * DAY), "UTC");

const fmt = (d: Date, tz: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ar-EG", { timeZone: tz, ...o }).format(d);

const timeLabel = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

function until(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} س و ${m % 60} د` : `${h} ساعة`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} يوم و ${h % 24} س` : `${d} يوم`;
}

const GRADIENT = "linear-gradient(125deg, #7c3aed 0%, #9333ea 50%, #db2777 100%)";
const BURST = ["#7c3aed", "#a855f7", "#ec4899", "#f43f5e", "#fb7185"];

/** Two blobs of the same colour that follow a target with different springs; the goo filter fuses them into liquid. */
function Liquid({
  x,
  y,
  w,
  h,
  show,
  gid,
  radius = 12,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  show: boolean;
  gid: string;
  radius?: number;
}) {
  const reduce = useReducedMotion();
  const fast = { stiffness: 420, damping: 24 };
  const slow = { stiffness: 110, damping: 15 };
  const ax = useSpring(x, (reduce ? { duration: 0 } : fast) as never);
  const ay = useSpring(y, (reduce ? { duration: 0 } : fast) as never);
  const bx = useSpring(x, (reduce ? { duration: 0 } : slow) as never);
  const by = useSpring(y, (reduce ? { duration: 0 } : slow) as never);

  React.useEffect(() => {
    ax.set(x);
    ay.set(y);
    bx.set(x);
    by.set(y);
  }, [x, y, ax, ay, bx, by]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0"
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      style={{
        filter: reduce ? undefined : `url(#${gid})`,
        width: 0,
        height: 0,
      }}
    >
      {[
        [ax, ay, 1],
        [bx, by, 0.92],
      ].map(([px, py, sc], i) => (
        <motion.span
          key={i}
          className="absolute block shadow-[0_8px_24px_-6px_rgba(124,58,237,0.8)]"
          style={{
            x: px as never,
            y: py as never,
            width: w,
            height: h,
            borderRadius: radius,
            background: GRADIENT,
            scale: sc as number,
          }}
        />
      ))}
    </motion.div>
  );
}

export function SlotWeekPicker({
  slots,
  timeZone,
  slotMinutes = 30,
  minNoticeHours = 2,
  now,
  title = "اختيار الموعد المناسب",
  onChange,
  onConfirm,
  className,
}: SlotWeekPickerProps) {
  const reduce = useReducedMotion();
  const gid = React.useId().replace(/:/g, "");
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = React.useRef(now ? new Date(now).getTime() : Date.now());
  const [clock, setClock] = React.useState(base.current);

  React.useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setClock(base.current + (Date.now() - t0)), 20_000);
    return () => clearInterval(id);
  }, []);

  const todayKey = keyOf(new Date(clock), tz);
  const [week, setWeek] = React.useState(0);
  const [dayKey, setDayKey] = React.useState<string>(() => {
    const firstFree = slots
      .map((s) => s.start)
      .sort()
      .find(
        (s) =>
          new Date(s).getTime() > base.current + minNoticeHours * 3600_000 &&
          !slots.find((x) => x.start === s)?.unavailableReason,
      );
    return firstFree ? keyOf(new Date(firstFree), tz) : keyOf(new Date(base.current), tz);
  });
  const [picked, setPicked] = React.useState<string | null>(null);
  const [focusIdx, setFocusIdx] = React.useState(0);
  const [peek, setPeek] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<"idle" | "busy" | "done">("idle");
  const [bursts, setBursts] = React.useState<{ id: number; x: number; y: number }[]>([]);
  const cells = React.useRef<(HTMLButtonElement | null)[]>([]);
  const stripRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [stripW, setStripW] = React.useState(380);
  const [gridW, setGridW] = React.useState(380);

  React.useEffect(() => {
    const ro = new ResizeObserver(() => {
      setStripW(stripRef.current?.offsetWidth ?? 380);
      setGridW(gridRef.current?.offsetWidth ?? 380);
    });
    if (stripRef.current) ro.observe(stripRef.current);
    if (gridRef.current) ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  // card depth
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [4, -4]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-5, 5]), { stiffness: 120, damping: 18 });
  const px = useMotionValue(-300);
  const py = useMotionValue(-300);
  const glow = useMotionTemplate`radial-gradient(280px circle at ${px}px ${py}px, rgba(168, 85, 247, 0.2), transparent 70%)`;

  const all = React.useMemo(
    () =>
      slots
        .map((s) => {
          const t = new Date(s.start);
          const ms = t.getTime();
          const reason =
            ms <= clock
              ? "انتهى هذا الوقت"
              : s.unavailableReason ??
                (ms - clock < minNoticeHours * 3600_000
                  ? `يحتاج إشعار مسبق ${minNoticeHours} ساعات`
                  : undefined);
          return { ...s, date: t, key: keyOf(t, tz), reason };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [slots, tz, clock, minNoticeHours],
  );

  const start = addDays(todayKey, week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const daySlots = all.filter((s) => s.key === dayKey);
  const sel = all.find((s) => s.start === picked && !s.reason);
  const selIdx = daySlots.findIndex((s) => s.start === picked && !s.reason);
  const dayIdx = days.indexOf(dayKey);

  const stripX = useMotionValue(0);
  const goWeek = (n: number) => {
    const w = Math.max(0, week + n);
    if (w === week) {
      animate(stripX, 0, { type: "spring", stiffness: 300, damping: 25 });
      return;
    }
    setWeek(w);
    setDayKey(addDays(todayKey, w * 7));
    setFocusIdx(0);
    if (!reduce) {
      stripX.set(n * 90);
      animate(stripX, 0, { type: "spring", stiffness: 170, damping: 14 });
    }
  };

  const choose = (i: number) => {
    const s = daySlots[i];
    if (!s || s.reason) return;
    setPicked(s.start);
    setStatus("idle");
    onChange?.({ start: s.start, unavailableReason: s.unavailableReason });
    if (!reduce) {
      const cw = (gridW - 16) / 3;
      const id = Date.now();
      setBursts((b) => [
        ...b,
        {
          id,
          x: (i % 3) * (cw + 8) + cw / 2,
          y: Math.floor(i / 3) * 52 + 22,
        },
      ]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
    }
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = daySlots.length;
    const move: Record<string, number> = {
      ArrowRight: i - 1, // RTL inverted
      ArrowLeft: i + 1,
      ArrowDown: i + 3,
      ArrowUp: i - 3,
      Home: 0,
      End: n - 1,
    };
    if (e.key in move) {
      e.preventDefault();
      const next = Math.min(n - 1, Math.max(0, move[e.key]));
      setFocusIdx(next);
      setPeek(next);
      cells.current[next]?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      choose(i);
    }
  };

  const confirm = async () => {
    if (!sel || status === "busy") return;
    setStatus("busy");
    try {
      await onConfirm?.({ start: sel.start, unavailableReason: sel.unavailableReason });
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  };

  const offset = fmt(new Date(clock), tz, { timeZoneName: "shortOffset" })
    .split(" ")
    .pop()
    ?.replace("GMT", "UTC");
  const range = `${fmt(new Date(days[0] + "T12:00:00Z"), "UTC", { month: "short", day: "numeric" })} إلى ${fmt(new Date(days[6] + "T12:00:00Z"), "UTC", { month: "short", day: "numeric" })}`;
  const peeked = peek !== null ? daySlots[peek] : undefined;
  const cellW = (gridW - 16) / 3;
  const dayW = stripW / 7;

  return (
    <div dir="rtl" className={cn("relative w-full max-w-lg", className)} style={{ perspective: 1100 }}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <filter id={gid}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feColorMatrix
              in="b"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[2.25rem] blur-2xl opacity-40"
        style={{
          background: "conic-gradient(from 90deg, #7c3aed, #ec4899, #db2777, #7c3aed)",
        }}
        animate={
          reduce
            ? { opacity: 0.25 }
            : { opacity: [0.25, 0.45, 0.25], rotate: [0, 4, 0] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.section
        aria-label={title}
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - b.left) / b.width);
          my.set((e.clientY - b.top) / b.height);
          px.set(e.clientX - b.left);
          py.set(e.clientY - b.top);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
        style={{
          rotateX: reduce ? 0 : rx,
          rotateY: reduce ? 0 : ry,
          transformStyle: "preserve-3d",
          borderColor: "var(--line)",
          background: "var(--surface)",
        }}
        initial={{ opacity: 0, y: reduce ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="relative rounded-3xl border p-5 shadow-2xl"
      >
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{ background: glow }}
          />
        )}

        <header
          className="relative mb-4 flex items-center justify-between gap-3 border-b pb-3.5"
          style={{ borderColor: "var(--line)", transform: "translateZ(20px)" }}
        >
          <div>
            <h2 className="text-base font-black leading-tight" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
            <p aria-live="polite" className="mt-1 text-xs font-bold" style={{ color: "var(--muted)" }}>
              الأسبوع: {range}
            </p>
          </div>
          <div className="flex gap-1.5">
            {[1, -1].map((n) => (
              <motion.button
                key={n}
                type="button"
                onClick={() => goWeek(n)}
                disabled={n < 0 && week === 0}
                whileTap={reduce ? undefined : { scale: 0.88 }}
                whileHover={reduce ? undefined : { y: -2 }}
                aria-label={n > 0 ? "الأسبوع التالي" : "الأسبوع السابق"}
                className="grid h-9 w-9 place-items-center rounded-xl border outline-none transition active:scale-95 disabled:opacity-35"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface-2)",
                  color: "var(--ink)",
                }}
              >
                {n > 0 ? (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                )}
              </motion.button>
            ))}
          </div>
        </header>

        {/* Week strip */}
        <div ref={stripRef} className="relative" style={{ transform: "translateZ(24px)" }}>
          <motion.div
            role="tablist"
            aria-label="الأيام"
            className="relative touch-pan-y"
            style={{ x: stripX }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 16 }}
            onDragEnd={(_, i) => {
              if (i.offset.x + i.velocity.x * 0.2 < -60) goWeek(1);
              else if (i.offset.x + i.velocity.x * 0.2 > 60) goWeek(-1);
              else animate(stripX, 0, { type: "spring", stiffness: 300, damping: 22 });
            }}
          >
            <Liquid
              gid={gid}
              x={Math.max(0, dayIdx) * dayW + 2}
              y={0}
              w={dayW - 4}
              h={64}
              show={dayIdx >= 0}
              radius={14}
            />
            <div className="relative grid grid-cols-7 gap-1">
              {days.map((k) => {
                const free = all.filter((s) => s.key === k && !s.reason).length;
                const on = k === dayKey;
                const d = new Date(k + "T12:00:00Z");
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => {
                      setDayKey(k);
                      setFocusIdx(0);
                      setPeek(null);
                    }}
                    aria-label={`${fmt(d, "UTC", { weekday: "long", month: "long", day: "numeric" })}, ${free ? `${free} متاح` : "غير متاح"}`}
                    className="relative flex h-16 flex-col items-center justify-center rounded-xl text-xs outline-none transition"
                  >
                    <span
                      className={cn(
                        "text-[10px] font-bold transition-colors",
                        on ? "text-white/90 font-black" : "text-muted",
                      )}
                    >
                      {fmt(d, "UTC", { weekday: "narrow" })}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-black tabular-nums transition-colors",
                        on ? "text-white" : free ? "text-ink" : "text-muted-2",
                      )}
                    >
                      {fmt(d, "UTC", { day: "numeric" })}
                    </span>
                    <span aria-hidden className="mt-0.5 flex h-1.5 gap-0.5">
                      {Array.from({ length: Math.min(free, 3) }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 w-1 rounded-full",
                            on ? "bg-white/90" : "bg-purple-500",
                          )}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Slot grid with liquid selection */}
        <div className="relative mt-4 min-h-[12rem]" style={{ transform: "translateZ(16px)" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={dayKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.01 : 0.12 }}
            >
              {daySlots.length === 0 ? (
                <div className="grid h-48 place-items-center rounded-2xl border border-dashed text-xs font-bold text-muted p-4 text-center">
                  لا توجد فترات مواعيد مجدولة في هذا اليوم.
                </div>
              ) : (
                <div
                  ref={gridRef}
                  role="radiogroup"
                  aria-label={`أوقات يوم ${fmt(new Date(dayKey + "T12:00:00Z"), "UTC", { weekday: "long", month: "long", day: "numeric" })}`}
                  className="relative grid grid-cols-3 gap-2"
                  onMouseLeave={() => setPeek(null)}
                >
                  <Liquid
                    gid={gid}
                    x={Math.max(0, selIdx % 3) * (cellW + 8)}
                    y={Math.max(0, Math.floor(selIdx / 3)) * 52}
                    w={cellW}
                    h={44}
                    show={selIdx >= 0}
                  />
                  {daySlots.map((s, i) => {
                    const on = i === selIdx;
                    return (
                      <motion.button
                        key={s.start}
                        ref={(el) => {
                          cells.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-disabled={!!s.reason || undefined}
                        tabIndex={i === Math.min(focusIdx, daySlots.length - 1) ? 0 : -1}
                        onClick={() => choose(i)}
                        onKeyDown={(e) => onKey(e, i)}
                        onFocus={() => {
                          setFocusIdx(i);
                          setPeek(i);
                        }}
                        onMouseEnter={() => setPeek(i)}
                        onBlur={() => setPeek(null)}
                        initial={{
                          opacity: 0,
                          y: reduce ? 0 : 16,
                          scale: reduce ? 1 : 0.9,
                        }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 16,
                          delay: reduce ? 0 : i * 0.02,
                        }}
                        whileHover={
                          reduce || s.reason ? undefined : { scale: 1.05, y: -2 }
                        }
                        whileTap={
                          reduce || s.reason ? undefined : { scale: 0.92, scaleY: 0.88 }
                        }
                        className={cn(
                          "relative flex h-11 items-center justify-center gap-1 rounded-xl border text-xs font-black tabular-nums outline-none transition-all duration-200",
                          s.reason
                            ? "cursor-not-allowed border-dashed opacity-45 line-through"
                            : on
                              ? "border-transparent text-white font-black shadow-lg"
                              : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] hover:border-purple-400",
                        )}
                      >
                        {s.reason && <Ban className="h-3 w-3 shrink-0" aria-hidden />}
                        <span className="relative">{timeLabel(s.date, tz)}</span>
                      </motion.button>
                    );
                  })}

                  {/* Soft particle burst from chosen tile */}
                  {bursts.map((b) => (
                    <span
                      key={b.id}
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-0 z-10"
                      style={{ transform: `translate(${b.x}px, ${b.y}px)` }}
                    >
                      {Array.from({ length: 18 }).map((_, i) => {
                        const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.2;
                        const r = 36 + ((i * 37) % 40);
                        return (
                          <motion.span
                            key={i}
                            className="absolute -ml-1 -mt-1 h-2 w-2 rounded-full blur-[1px]"
                            style={{
                              background: BURST[i % BURST.length],
                              boxShadow: `0 0 10px ${BURST[i % BURST.length]}`,
                            }}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{
                              x: Math.cos(a) * r,
                              y: Math.sin(a) * r * 0.8 + 14,
                              opacity: 0,
                              scale: 0.2,
                            }}
                            transition={{ duration: 0.9, ease: [0.1, 0.8, 0.3, 1] }}
                          />
                        );
                      })}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Hover / focus peek feedback */}
        <p aria-live="polite" className="relative mt-2.5 h-5 text-[11px] font-bold text-muted">
          <AnimatePresence mode="wait" initial={false}>
            {peeked?.reason && (
              <motion.span
                key={peeked.start}
                initial={{ opacity: 0, y: reduce ? 0 : 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="inline-flex items-center gap-1.5 text-rose-500"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden /> وقت {timeLabel(peeked.date, tz)} غير متاح: {peeked.reason}.
              </motion.span>
            )}
          </AnimatePresence>
        </p>

        {/* Footer controls */}
        <footer
          className="relative mt-3 border-t pt-4"
          style={{ borderColor: "var(--line)", transform: "translateZ(18px)" }}
        >
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-muted">
            <Globe2 className="h-3.5 w-3.5 text-purple-400" aria-hidden /> التوقيت المحلي ({offset})
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-xs font-bold" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {sel ? (
                  <motion.div
                    key={sel.start}
                    initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <p className="truncate font-black" style={{ color: "var(--ink)" }}>
                      {fmt(sel.date, tz, { weekday: "long", month: "long", day: "numeric" })} · {timeLabel(sel.date, tz)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-purple-600 font-extrabold">
                      <Hourglass className="h-3 w-3" aria-hidden /> يبدأ خلال {until(sel.date.getTime() - clock)}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted text-[11px]"
                  >
                    يرجى اختيار موعد من الجدول.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              onClick={confirm}
              disabled={!sel || status === "busy"}
              whileTap={reduce || !sel ? undefined : { scale: 0.94 }}
              whileHover={reduce || !sel ? undefined : { y: -2 }}
              animate={
                sel && !reduce && status === "idle"
                  ? {
                      boxShadow: [
                        "0 8px 20px -8px rgba(124,58,237,0.5)",
                        "0 8px 30px -4px rgba(219,39,119,0.7)",
                        "0 8px 20px -8px rgba(124,58,237,0.5)",
                      ],
                    }
                  : { boxShadow: "0 0 0 rgba(0,0,0,0)" }
              }
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{ background: GRADIENT }}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white shadow-lg outline-none transition disabled:opacity-40"
            >
              {status === "busy" ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <CalendarCheck className="h-4 w-4" aria-hidden />
              )}
              {status === "done" ? "تم تثبيت الموعد ✓" : "تأكيد وحجز الموعد"}
            </motion.button>
          </div>
        </footer>
      </motion.section>
    </div>
  );
}

export default SlotWeekPicker;
