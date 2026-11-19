"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

export type OtpInputProps = {
  /** Number of digits. Defaults to 6. */
  length?: number;
  /** Controlled value. Digits only; missing positions are empty. */
  value: string;
  onChange: (value: string) => void;
  /** Fired once the last digit is filled. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

/** Keeps only digits and trims to `length`. */
function sanitize(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

/**
 * OtpInput — adapted for Luniva. A dependency-free six-digit code field with
 * auto-advance, paste support, arrow/backspace navigation and reduced-motion
 * aware styling that follows the Luniva design tokens.
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = false,
  label = "رمز التحقق",
  hint,
  className,
}: OtpInputProps) {
  const baseId = useId();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusAt = useCallback(
    (index: number) => {
      const target = Math.min(length - 1, Math.max(0, index));
      inputs.current[target]?.focus();
      inputs.current[target]?.select();
    },
    [length],
  );

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  const commit = useCallback(
    (next: string) => {
      const clean = sanitize(next, length);
      onChange(clean);
      if (clean.length === length) onComplete?.(clean);
    },
    [length, onChange, onComplete],
  );

  const handleChange = (index: number, raw: string) => {
    const typed = sanitize(raw, length);
    if (!typed) {
      const chars = digits.slice();
      chars[index] = "";
      commit(chars.join(""));
      return;
    }

    // Typing into a filled box, or pasting several digits into one box.
    const chars = digits.slice();
    for (let offset = 0; offset < typed.length && index + offset < length; offset += 1) {
      chars[index + offset] = typed[offset];
    }
    commit(chars.join(""));
    focusAt(index + typed.length);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (digits[index]) return;
      event.preventDefault();
      if (index > 0) {
        const chars = digits.slice();
        chars[index - 1] = "";
        commit(chars.join(""));
        focusAt(index - 1);
      }
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      const chars = digits.slice();
      chars[index] = "";
      commit(chars.join(""));
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusAt(length - 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = sanitize(event.clipboardData.getData("text"), length);
    if (!pasted) return;
    event.preventDefault();
    const chars = digits.slice();
    for (let offset = 0; offset < pasted.length && index + offset < length; offset += 1) {
      chars[index + offset] = pasted[offset];
    }
    commit(chars.join(""));
    focusAt(index + pasted.length);
  };

  return (
    <div
      className={["lv-otp", className].filter(Boolean).join(" ")}
      data-invalid={invalid ? "true" : undefined}
      dir="ltr"
    >
      <style href="luniva-otp-input" precedence="default">
        {css}
      </style>

      <div className="lv-otp__boxes" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={`${baseId}-${index}`}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            id={`${baseId}-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`${label} — الخانة ${index + 1} من ${length}`}
            aria-invalid={invalid || undefined}
            className="lv-otp__box"
            data-filled={digit ? "true" : undefined}
            data-focus={focusIndex === index ? "true" : undefined}
            onChange={(event) => handleChange(index, event.currentTarget.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => {
              setFocusIndex(index);
              event.currentTarget.select();
            }}
            onBlur={() => setFocusIndex((current) => (current === index ? null : current))}
          />
        ))}
      </div>

      {hint && <p className="lv-otp__hint">{hint}</p>}
    </div>
  );
}

const css = /* css */ `
.lv-otp {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  font-family: inherit;
}
.lv-otp *,
.lv-otp *::before,
.lv-otp *::after { box-sizing: border-box; }

.lv-otp__boxes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  direction: ltr;
}

.lv-otp__box {
  flex: 1 1 0;
  min-width: 0;
  max-width: 56px;
  height: 56px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink);
  font-family: inherit;
  font-size: 22px;
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
  outline: none;
  caret-color: var(--brand);
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease, transform 150ms ease;
}

.lv-otp__box::selection { background: var(--brand-soft); color: var(--brand-strong); }
.lv-otp__box:hover:not(:disabled) { border-color: var(--line-strong); }
.lv-otp__box[data-filled="true"] { border-color: var(--line-strong); background: var(--surface); }
.lv-otp__box[data-focus="true"] {
  border-color: var(--brand);
  background: var(--surface);
  box-shadow: 0 0 0 4px var(--brand-ring);
  transform: translateY(-1px);
}
.lv-otp__box:disabled { opacity: 0.55; cursor: not-allowed; }

.lv-otp[data-invalid="true"] .lv-otp__box {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 18%, transparent);
}

.lv-otp__hint {
  margin: 0;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-2);
  direction: rtl;
}

@media (max-width: 400px) {
  .lv-otp__boxes { gap: 5px; }
  .lv-otp__box { height: 48px; border-radius: 11px; font-size: 19px; }
}

@media (prefers-reduced-motion: reduce) {
  .lv-otp *,
  .lv-otp *::before,
  .lv-otp *::after { transition: none !important; animation: none !important; }
  .lv-otp__box[data-focus="true"] { transform: none; }
}
`;
