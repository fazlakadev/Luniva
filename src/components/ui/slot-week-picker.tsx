"use client";

import * as React from "react";
import {
  AnimatePresence,
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
  Sparkles,
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

const GRADIENT = "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #db2777 100%)";

export function SlotWeekPicker({
  slots,
  timeZone,
  minNoticeHours = 2,
  now,
  title = "اختيار الموعد المناسب",
  onChange,
  onConfirm,
  className,
}: SlotWeekPickerProps) {
  const reduce = useReducedMotion();
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
  const cells = React.useRef<(HTMLButtonElement | null)[]>([]);

  // 3D Card Depth & subtle glow
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [3, -3]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-4, 4]), { stiffness: 120, damping: 18 });
  const px = useMotionValue(-300);
  const py = useMotionValue(-300);
  const glow = useMotionTemplate`radial-gradient(280px circle at ${px}px ${py}px, rgba(168, 85, 247, 0.18), transparent 70%)`;

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

  const goWeek = (direction: -1 | 1) => {
    // In RTL: direction -1 is previous week (past), direction +1 is next week (future)
    const nextWeek = Math.max(0, week + direction);
    if (nextWeek === week) return;
    setWeek(nextWeek);
    setDayKey(addDays(todayKey, nextWeek * 7));
    setFocusIdx(0);
  };

  const choose = (i: number) => {
    const s = daySlots[i];
    if (!s || s.reason) return;
    setPicked(s.start);
    setStatus("idle");
    onChange?.({ start: s.start, unavailableReason: s.unavailableReason });
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = daySlots.length;
    const move: Record<string, number> = {
      ArrowRight: i - 1,
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

  return (
    <div dir="rtl" className={cn("relative w-full max-w-xl", className)} style={{ perspective: 1100 }}>
      {/* Background ambient aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[2.5rem] blur-2xl opacity-35"
        style={{
          background: "conic-gradient(from 180deg, #7c3aed, #ec4899, #db2777, #7c3aed)",
        }}
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
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl border p-5 sm:p-6 shadow-2xl overflow-hidden"
      >
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{ background: glow }}
          />
        )}

        {/* Top Header with RTL Aware Navigation */}
        <header
          className="relative mb-5 flex items-center justify-between gap-3 border-b pb-4"
          style={{ borderColor: "var(--line)", transform: "translateZ(15px)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: GRADIENT }}
            >
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-black text-ink">{title}</h2>
              <p aria-live="polite" className="text-xs font-bold text-muted">
                الأسبوع: {range}
              </p>
            </div>
          </div>

          {/* Navigation Controls: In RTL, Right arrow goes Back (Previous), Left arrow goes Forward (Next) */}
          <div className="flex items-center gap-1.5" dir="rtl">
            <button
              type="button"
              onClick={() => goWeek(-1)}
              disabled={week === 0}
              aria-label="الأسبوع السابق"
              title="الأسبوع السابق"
              className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-ink transition hover:bg-[var(--surface-3)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>

            <span className="px-2 text-xs font-black text-ink select-none">
              {week === 0 ? "هذا الأسبوع" : `+${week} أسبوع`}
            </span>

            <button
              type="button"
              onClick={() => goWeek(1)}
              aria-label="الأسبوع التالي"
              title="الأسبوع التالي"
              className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-ink transition hover:bg-[var(--surface-3)] active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        {/* Week Strip (7 Days): Full RTL Perfect Layout with layoutId pill */}
        <div className="relative mb-5" style={{ transform: "translateZ(20px)" }}>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {days.map((k) => {
              const free = all.filter((s) => s.key === k && !s.reason).length;
              const dateObj = new Date(k + "T12:00:00Z");
              const isTodayDay = k === todayKey;
              const active = k === dayKey;
              const weekday = fmt(dateObj, "UTC", { weekday: "short" });
              const dayNumber = fmt(dateObj, "UTC", { day: "numeric" });

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setDayKey(k);
                    setFocusIdx(0);
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border transition-all duration-200 outline-none select-none",
                    active
                      ? "border-transparent text-white shadow-lg"
                      : "border-[var(--line)] bg-[var(--surface-2)]/60 text-ink hover:bg-[var(--surface-2)] hover:border-purple-300",
                  )}
                >
                  {/* Active Day Shading Pill (Immune to RTL bug) */}
                  {active && (
                    <motion.span
                      layoutId="active-day-pill"
                      className="absolute inset-0 rounded-2xl shadow-[0_8px_20px_-6px_rgba(124,58,237,0.7)]"
                      style={{ background: GRADIENT, zIndex: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  )}

                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-bold",
                      active ? "text-purple-100" : isTodayDay ? "text-purple-600 dark:text-purple-400 font-black" : "text-muted",
                    )}
                  >
                    {weekday}
                  </span>

                  <span
                    className={cn(
                      "relative z-10 text-sm font-black my-0.5",
                      active ? "text-white" : "text-ink",
                    )}
                  >
                    {dayNumber}
                  </span>

                  <span
                    className={cn(
                      "relative z-10 inline-flex items-center gap-0.5 text-[9px] font-bold px-1 rounded-full",
                      active
                        ? "bg-white/20 text-white"
                        : free > 0
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "text-muted opacity-60",
                    )}
                  >
                    {free > 0 ? `${free} متاح` : "ممتلئ"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Header Label */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-3">
          <p className="text-xs font-black text-ink">
            الفترات الزمنية ليوم:{" "}
            <span className="text-purple-600 dark:text-purple-400">
              {fmt(new Date(dayKey + "T12:00:00Z"), "UTC", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </p>
          <span className="text-[10px] font-bold text-muted">
            {daySlots.filter((s) => !s.reason).length} فترة متاحة
          </span>
        </div>

        {/* Slot Grid: 3 columns, layoutId pill for 100% accurate RTL highlight */}
        <div className="relative min-h-[14rem]" style={{ transform: "translateZ(16px)" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={dayKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {daySlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-[var(--line)] p-4 text-center">
                  <Ban size={24} className="text-muted mb-1.5" />
                  <p className="text-xs font-bold text-ink">لا توجد مواعيد متاحة في هذا اليوم</p>
                  <p className="text-[11px] text-muted mt-0.5">يرجى اختيار يوم آخر من الشريط أعلاه</p>
                </div>
              ) : (
                <div
                  ref={(el) => {}}
                  role="radiogroup"
                  aria-label="الفترات المتاحة"
                  className="grid grid-cols-3 gap-2"
                  onMouseLeave={() => setPeek(null)}
                >
                  {daySlots.map((s, i) => {
                    const on = s.start === picked && !s.reason;
                    const disabled = Boolean(s.reason);

                    return (
                      <motion.button
                        key={s.start}
                        ref={(el) => {
                          cells.current[i] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-disabled={disabled || undefined}
                        tabIndex={i === Math.min(focusIdx, daySlots.length - 1) ? 0 : -1}
                        onClick={() => choose(i)}
                        onKeyDown={(e) => onKey(e, i)}
                        onFocus={() => {
                          setFocusIdx(i);
                          setPeek(i);
                        }}
                        onMouseEnter={() => setPeek(i)}
                        onBlur={() => setPeek(null)}
                        whileTap={disabled ? undefined : { scale: 0.95 }}
                        className={cn(
                          "relative flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs font-black tabular-nums outline-none transition-all duration-150 overflow-hidden",
                          disabled
                            ? "cursor-not-allowed border-dashed border-[var(--line)] bg-[var(--surface-2)]/30 text-muted opacity-40 line-through"
                            : on
                            ? "border-transparent text-white shadow-md font-black"
                            : "border-[var(--line)] bg-[var(--surface-2)] text-ink hover:border-purple-400 hover:bg-[var(--surface-3)]",
                        )}
                      >
                        {/* Selected Slot Shading Pill (Morphs accurately in RTL) */}
                        {on && (
                          <motion.span
                            layoutId="active-slot-pill"
                            className="absolute inset-0 rounded-xl shadow-[0_6px_20px_-4px_rgba(124,58,237,0.75)]"
                            style={{ background: GRADIENT, zIndex: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          />
                        )}

                        {disabled && <Ban className="h-3 w-3 shrink-0 relative z-10" aria-hidden />}
                        <span className="relative z-10">{timeLabel(s.date, tz)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Hover / Reason Feedback */}
        <div aria-live="polite" className="relative mt-2.5 h-6 text-[11px] font-bold text-muted">
          <AnimatePresence mode="wait" initial={false}>
            {peeked?.reason && (
              <motion.span
                key={peeked.start}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5 text-rose-500 font-bold"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden /> وقت {timeLabel(peeked.date, tz)} غير متاح: {peeked.reason}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with Selected Time summary and Confirmation button */}
        <footer
          className="relative mt-2 border-t pt-4"
          style={{ borderColor: "var(--line)", transform: "translateZ(18px)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-xs font-bold" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {sel ? (
                  <motion.div
                    key={sel.start}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="truncate font-black text-ink text-sm">
                      {fmt(sel.date, tz, { weekday: "long", month: "long", day: "numeric" })} · {timeLabel(sel.date, tz)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-purple-600 dark:text-purple-400 font-extrabold">
                      <Hourglass className="h-3 w-3" aria-hidden /> يبدأ خلال {until(sel.date.getTime() - clock)}
                    </p>
                  </motion.div>
                ) : (
                  <p className="text-muted text-[11px]">
                    اضغطي على أي فترة زمنية متاحة أعلاه لاختيارها.
                  </p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={confirm}
              disabled={!sel || status === "busy"}
              style={{ background: GRADIENT }}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-5 py-2 text-xs font-black text-white shadow-lg transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {status === "busy" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CalendarCheck className="h-4 w-4" aria-hidden />
              )}
              {status === "done" ? "تم تثبيت الموعد ✓" : "تأكيد وتثبيت الموعد"}
            </button>
          </div>
        </footer>
      </motion.section>
    </div>
  );
}

export default SlotWeekPicker;
