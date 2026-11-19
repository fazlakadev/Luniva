"use client";

import * as React from "react";
import { ColorPickerPopover } from "@/components/ui/color-picker";
import { COLOR_SUGGESTIONS, canonicalColorName, colorSwatch } from "@/lib/colors";

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

/**
 * Extra aliases from `src/lib/colors.ts` that are useful when matching a
 * picked hex back to a readable Arabic name. The source map stays untouched;
 * we only read its swatches through `colorSwatch`.
 */
const EXTRA_NAMES = [
  "كريمي", "لبني", "نبيتي", "خمري", "عنابي", "مارون", "كورالي",
  "بيج غامق", "كحلي غامق", "فستقي", "نعناعي", "ليلكي", "فوشيا",
  "متعدد", "ملون", "أحمر", "أحمراء", "صفراء", "سوداء", "بيضاء",
  "رصاصي", "سالمون", "كافيه", "هافان", "نود", "جملي", "توتي",
  "بمبي", "ليموني", "شامبانيا", "تيراكوتا", "ذهبي وردي", "فضي غامق",
  "أزرق فاتح", "أزرق غامق", "أخضر فاتح", "أخضر غامق", "أوف وايت",
];

type Swatch = { name: string; hex: string; r: number; g: number; b: number };

const SWATCHES: Swatch[] = (() => {
  const byHex = new Map<string, Swatch>();
  for (const raw of [...COLOR_SUGGESTIONS, ...EXTRA_NAMES]) {
    const swatch = colorSwatch(raw);
    const match = /^#([0-9a-f]{6})$/i.exec(swatch);
    if (!match || byHex.has(match[0].toLowerCase())) continue;
    const hex = match[0].toLowerCase();
    byHex.set(hex, {
      name: canonicalColorName(raw) || raw.trim(),
      hex,
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });
  }
  return [...byHex.values()];
})();

function normalizeHex(css: string): string | null {
  const input = css.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(input);
  if (!hex) return null;
  let value = hex[1];
  if (value.length === 3 || value.length === 4) {
    value = value.split("").map((char) => char + char).join("");
  }
  if (value.length === 6 || value.length === 8) return `#${value.slice(0, 6)}`;
  return null;
}

/** Perceptual-ish RGB distance: green matters more than blue to the eye. */
function distance(a: Swatch, r: number, g: number, b: number) {
  const dr = a.r - r;
  const dg = a.g - g;
  const db = a.b - b;
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

/** Exact swatch match first, otherwise the closest known colour within a sane range. */
function nearestArabicName(css: string): string | null {
  const hex = normalizeHex(css);
  if (!hex) return null;
  const exact = SWATCHES.find((swatch) => swatch.hex === hex);
  if (exact) return exact.name;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let best: Swatch | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const swatch of SWATCHES) {
    const current = distance(swatch, r, g, b);
    if (current < bestDistance) {
      best = swatch;
      bestDistance = current;
    }
  }
  return best && bestDistance <= 115 ? best.name : null;
}

export type ColorFieldProps = {
  /** Free-text colour name as stored in the DB (e.g. "أسود"). */
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  /** id of an existing <datalist> of suggestions. */
  listId?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  pickerLabel?: string;
};

/**
 * Text field for an Arabic colour name plus the supplied colour picker as a
 * visual helper. Picking a hex writes the nearest known Arabic name (or the
 * raw hex) into the same text state — the data model is unchanged.
 */
export default function ColorField({
  value,
  onChange,
  onBlur,
  label = "اللون",
  placeholder = "أحمر",
  id,
  listId,
  maxLength = 80,
  disabled = false,
  className,
  inputClassName,
  pickerLabel = "اختيار لون",
}: ColorFieldProps) {
  const swatch = React.useMemo(() => colorSwatch(value || ""), [value]);
  const pickerValue = /^#([0-9a-f]{6})$/i.test(swatch) ? swatch : undefined;

  function handlePick(css: string) {
    onChange(nearestArabicName(css) ?? css);
  }

  return (
    <div className={cn("min-w-0", className)}>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="relative block min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full shadow-sm"
            style={{
              background: swatch,
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)",
            }}
          />
          <input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={(event) => onBlur?.(event.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            list={listId}
            disabled={disabled}
            dir="rtl"
            className={cn("field min-w-0", inputClassName)}
          />
        </span>
        <ColorPickerPopover
          value={pickerValue}
          onValueChange={handlePick}
          label={pickerLabel}
          allowGradient={false}
          align="start"
          side="bottom"
          className="!w-full max-w-full"
          triggerClassName="!h-[42px] !w-[42px] !justify-center !rounded-xl !p-1 [&>span:not(:first-child)]:sr-only"
        />
      </div>
    </div>
  );
}
