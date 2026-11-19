"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

/* Local class helper — keeps this field free of new dependencies. */
type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | { [key: string]: boolean | undefined };

function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") out.push(String(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else for (const key of Object.keys(value)) if (value[key]) out.push(key);
  };
  inputs.forEach(walk);
  return out.join(" ");
}

/* Mount-only flag without a setState-in-effect (React 19 lint rule). */
const subscribeNever = () => () => {};
const isClient = () => true;
const isServer = () => false;

/** Local-calendar ISO formatting — never use toISOString() (UTC shifts the day). */
function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISO(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

export type DateFieldProps = {
  /** ISO `yyyy-mm-dd` string, or an empty string for "no date". */
  value: string;
  onChange: (value: string) => void;
  /** Visible Arabic label. */
  label: string;
  /** Optional hidden input name, for native FormData submission. */
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  controlClassName?: string;
  clearLabel?: string;
  closeLabel?: string;
};

const PANEL_WIDTH = 316; // Calendar's 300px + the popover's padding.
const PANEL_HEIGHT = 330; // Enough for a 6-week grid plus the footer.
const VIEWPORT_MARGIN = 12;

/**
 * A normal-looking date input that opens the supplied <Calendar> on click.
 * The public value stays an ISO string, so existing validation and DB writes
 * do not need to change.
 */
export default function DateField({
  value,
  onChange,
  label,
  name,
  id,
  placeholder,
  disabled = false,
  className,
  controlClassName,
  clearLabel = "مسح التاريخ",
  closeLabel = "إغلاق",
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const mounted = React.useSyncExternalStore(subscribeNever, isClient, isServer);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();
  const reduceMotion = useReducedMotion();

  const selectedDate = React.useMemo(() => fromISO(value), [value]);
  const hasPos = pos !== null;

  const place = React.useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < PANEL_HEIGHT && rect.top > spaceBelow;
    const top = openAbove
      ? Math.max(VIEWPORT_MARGIN, rect.top - PANEL_HEIGHT - 8)
      : rect.bottom + 8;
    setPos({ top, left, width });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, place]);

  // Move focus into the calendar when it opens so arrow keys work immediately.
  React.useEffect(() => {
    if (!open || !hasPos) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('[data-date-key][tabindex="0"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, hasPos]);

  function handleSelect(date: Date | undefined) {
    onChange(date ? toISO(date) : "");
    setOpen(false);
    triggerRef.current?.focus();
  }

  function clear() {
    onChange("");
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={cn("min-w-0", className)}>
      <span className="field-label">{label}</span>
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      <div ref={anchorRef} className="relative min-w-0">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`${label}، ${value || placeholder || "غير محدد"}`}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            "field flex w-full items-center gap-2 py-2 pe-9 text-start text-[11px]",
            "transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none",
            "outline-none focus-visible:border-[var(--brand)] focus-visible:bg-[var(--surface)] focus-visible:shadow-[0_0_0_4px_var(--brand-ring)]",
            controlClassName,
          )}
        >
          <CalendarDays size={14} aria-hidden="true" className="shrink-0 opacity-70" />
          <span
            className={cn(
              "min-w-0 flex-1 truncate tabular-nums",
              value ? "text-[var(--ink)]" : "text-[var(--muted-2)]",
            )}
          >
            {value || placeholder || "yyyy-mm-dd"}
          </span>
        </button>
        {value && !disabled ? (
          <button
            type="button"
            onClick={clear}
            aria-label={`${clearLabel} ${label}`}
            title={clearLabel}
            className={cn(
              "absolute inset-y-1 left-1.5 grid w-7 place-items-center rounded-lg",
              "text-[var(--muted-2)] outline-none transition-colors duration-150 motion-reduce:transition-none",
              "hover:bg-[var(--surface-3)] hover:text-[var(--danger)]",
              "focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
            )}
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {mounted && open && pos
        ? createPortal(
            <motion.div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label}
              dir="rtl"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.16, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-2xl border p-2 shadow-lg"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
                zIndex: 80,
                background: "var(--surface)",
                borderColor: "var(--line)",
              }}
            >
              {/* The supplied calendar uses Latin month/weekday labels and LTR arrows. */}
              <div dir="ltr">
                <Calendar
                  key={value || "empty"}
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate}
                  onSelect={handleSelect}
                  className="mx-auto max-w-full border-0 bg-transparent p-0"
                />
              </div>
              <div
                className="mt-2 flex items-center justify-between gap-2 border-t pt-2"
                style={{ borderColor: "var(--line)" }}
              >
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--danger)] outline-none hover:bg-[var(--danger-soft)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {clearLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--muted)] outline-none hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {closeLabel}
                </button>
              </div>
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  );
}
