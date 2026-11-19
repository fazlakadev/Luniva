"use client";

import { X } from "lucide-react";
import { useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { formatMoney, formatNumber } from "@/lib/format";

export type PriceRangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  /** `null` means the full range, i.e. no price filter. */
  value: [number, number] | null;
  onCommit: (range: [number, number]) => void;
  label?: string;
  clearLabel?: string;
  className?: string;
};

function clampToStep(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

export default function PriceRangeSlider({
  min,
  max,
  step: stepProp = 5,
  value,
  onCommit,
  label = "نطاق السعر",
  clearLabel = "مسح",
  className,
}: PriceRangeSliderProps) {
  const safeMax = Math.max(min + 1, Math.round(max));
  const safeMin = Math.max(0, Math.min(min, safeMax - 1));
  const step = Math.max(1, Math.round(stepProp));
  const span = safeMax - safeMin;

  const normalize = (range: [number, number] | null): [number, number] => {
    if (!range) return [safeMin, safeMax];
    const low = clampToStep(range[0], safeMin, safeMax, step);
    const high = clampToStep(range[1], safeMin, safeMax, step);
    return low <= high ? [low, high] : [high, low];
  };

  const valueKey = value ? `${value[0]}:${value[1]}` : "";
  const [lastKey, setLastKey] = useState(valueKey);
  const [range, setRange] = useState<[number, number]>(() => normalize(value));
  const [preview, setPreview] = useState<number | null>(null);

  // Keep the thumbs in sync when the URL/active chips change the committed range.
  if (valueKey !== lastKey) {
    setLastKey(valueKey);
    setRange(normalize(value));
  }

  const [low, high] = range;
  const isFull = low <= safeMin && high >= safeMax;

  const toPct = (amount: number) => ((amount - safeMin) / span) * 100;
  const lowPct = toPct(low);
  const highPct = toPct(high);
  const previewPct = preview !== null ? toPct(preview) : null;

  let ghostLeft = 0;
  let ghostWidth = 0;
  if (previewPct !== null) {
    if (previewPct < lowPct) {
      ghostLeft = previewPct;
      ghostWidth = lowPct - previewPct;
    } else if (previewPct > highPct) {
      ghostLeft = highPct;
      ghostWidth = previewPct - highPct;
    }
  }

  const labels = useMemo(() => {
    const values: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      const amount = clampToStep(safeMin + (index * span) / 4, safeMin, safeMax, step);
      if (!values.includes(amount)) values.push(amount);
    }
    if (values[values.length - 1] !== safeMax) values.push(safeMax);
    return values;
  }, [safeMin, safeMax, span, step]);

  const commit = () => onCommit([low, high]);

  const updateLow = (next: number) => {
    const amount = clampToStep(next, safeMin, safeMax, step);
    setRange([Math.min(amount, high), high]);
  };

  const updateHigh = (next: number) => {
    const amount = clampToStep(next, safeMin, safeMax, step);
    setRange([low, Math.max(amount, low)]);
  };

  const handlePreview = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    setPreview(clampToStep(safeMin + ratio * span, safeMin, safeMax, step));
  };

  const clear = () => {
    setRange([safeMin, safeMax]);
    onCommit([safeMin, safeMax]);
  };

  // Only matters when both thumbs sit on top of each other.
  const lowerOnTop = low > safeMin + span * 0.5;

  return (
    <div className={["lv-slider", className].filter(Boolean).join(" ")} dir="rtl">
      <style href="luniva-price-slider" precedence="default">
        {css}
      </style>

      <div className="lv-slider__head">
        <div className="lv-slider__heading">
          <p className="lv-slider__label">{label}</p>
          <div className="lv-slider__value" dir="rtl">
            <span>{formatMoney(low)}</span>
            <span className="lv-slider__dash">–</span>
            <span>{formatMoney(high)}</span>
          </div>
        </div>
        <button
          type="button"
          className="lv-slider__clear"
          onClick={clear}
          disabled={isFull}
          aria-label={clearLabel}
          title={clearLabel}
        >
          <X size={13} />
          {clearLabel}
        </button>
      </div>

      <div
        className="lv-slider__track-wrap"
        dir="ltr"
        onPointerMove={handlePreview}
        onPointerLeave={() => setPreview(null)}
      >
        <div className="lv-slider__track" aria-hidden="true">
          <span className="lv-slider__track-base" />
          <span
            className="lv-slider__track-range"
            style={{ left: `${lowPct}%`, width: `${Math.max(0, highPct - lowPct)}%` }}
          />
          {ghostWidth > 0 && (
            <span className="lv-slider__ghost" style={{ left: `${ghostLeft}%`, width: `${ghostWidth}%` }} />
          )}
        </div>

        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={low}
          onChange={(event) => updateLow(Number(event.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          aria-label="أقل سعر"
          aria-valuetext={formatMoney(low)}
          className="lv-slider__input lv-slider__input--low"
          style={{ zIndex: lowerOnTop ? 5 : 3 } as CSSProperties}
        />
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={high}
          onChange={(event) => updateHigh(Number(event.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          aria-label="أعلى سعر"
          aria-valuetext={formatMoney(high)}
          className="lv-slider__input lv-slider__input--high"
          style={{ zIndex: lowerOnTop ? 3 : 5 } as CSSProperties}
        />
      </div>

      <div className="lv-slider__labels" dir="ltr">
        {labels.map((amount) => (
          <span key={amount}>{formatNumber(amount)}</span>
        ))}
      </div>
    </div>
  );
}

const css = /* css */ `
.lv-slider {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
  font-family: inherit;
}
.lv-slider *,
.lv-slider *::before,
.lv-slider *::after { box-sizing: border-box; }

.lv-slider__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.lv-slider__heading { min-width: 0; }
.lv-slider__label {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--muted-2);
  text-transform: uppercase;
}
.lv-slider__value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lv-slider__dash { color: var(--muted-2); }

.lv-slider__clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  padding: 5px 9px;
  font-size: 10px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease, opacity 150ms ease;
}
.lv-slider__clear:hover:not(:disabled) { color: var(--brand-strong); border-color: var(--brand); background: var(--brand-soft); }
.lv-slider__clear:disabled { opacity: 0.45; cursor: default; }

.lv-slider__track-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  touch-action: none;
}
.lv-slider__track {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  height: 8px;
  transform: translateY(-50%);
  border-radius: 999px;
  overflow: hidden;
}
.lv-slider__track-base {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--surface-3);
  border: 1px solid var(--line);
}
.lv-slider__track-range {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--brand), var(--brand-strong));
}
.lv-slider__ghost {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 26%, transparent);
  transition: left 60ms linear, width 60ms linear;
}

.lv-slider__input {
  position: absolute;
  inset-inline: 0;
  top: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  pointer-events: none;
  cursor: pointer;
}
.lv-slider__input:focus-visible { outline: none; }

.lv-slider__input::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
  border: none;
}
.lv-slider__input::-moz-range-track {
  height: 8px;
  background: transparent;
  border: none;
}

.lv-slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
  width: 20px;
  height: 20px;
  margin-top: -6px;
  border-radius: 999px;
  border: 2px solid var(--brand);
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(58, 34, 44, 0.18);
  cursor: grab;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
}
.lv-slider__input::-moz-range-thumb {
  pointer-events: auto;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid var(--brand);
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(58, 34, 44, 0.18);
  cursor: grab;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
}
.lv-slider__input:hover::-webkit-slider-thumb,
.lv-slider__input:focus-visible::-webkit-slider-thumb {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px var(--brand-ring), 0 2px 8px rgba(58, 34, 44, 0.18);
}
.lv-slider__input:hover::-moz-range-thumb,
.lv-slider__input:focus-visible::-moz-range-thumb {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px var(--brand-ring), 0 2px 8px rgba(58, 34, 44, 0.18);
}
.lv-slider__input:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.2); }
.lv-slider__input:active::-moz-range-thumb { cursor: grabbing; transform: scale(1.2); }

.lv-slider__labels {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-2);
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.lv-slider__labels span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .lv-slider *,
  .lv-slider *::before,
  .lv-slider *::after { transition: none !important; animation: none !important; }
}
`;
