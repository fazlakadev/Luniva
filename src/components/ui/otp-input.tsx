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
 * OtpInput — Ultra-professional, animated 6-digit verification code input.
 * Supports auto-advance, paste, arrow/backspace navigation, pulsing cursor,
 * and 3-3 grouping with an elegant divider.
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
  className = "",
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
    if (autoFocus) {
      const timer = setTimeout(() => inputs.current[0]?.focus(), 150);
      return () => clearTimeout(timer);
    }
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

    const chars = digits.slice();
    for (let offset = 0; offset < typed.length && index + offset < length; offset += 1) {
      chars[index + offset] = typed[offset];
    }
    commit(chars.join(""));
    focusAt(index + typed.length);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        const chars = digits.slice();
        chars[index] = "";
        commit(chars.join(""));
        return;
      }
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
    focusAt(Math.min(length - 1, index + pasted.length));
  };

  return (
    <div
      className={`lv-otp-wrapper ${invalid ? "lv-otp--invalid" : ""} ${className}`.trim()}
      dir="ltr"
    >
      <style href="luniva-pro-otp-input" precedence="default">
        {css}
      </style>

      <div className="lv-otp__container" role="group" aria-label={label}>
        {digits.map((digit, index) => {
          const isFocused = focusIndex === index;
          const isFilled = Boolean(digit);
          const showSeparator = length === 6 && index === 2;

          return (
            <div key={`${baseId}-${index}`} className="flex items-center gap-2">
              <div
                className="lv-otp__box-wrap"
                data-filled={isFilled ? "true" : undefined}
                data-focused={isFocused ? "true" : undefined}
                data-invalid={invalid ? "true" : undefined}
              >
                <input
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
                  className="lv-otp__input"
                  onChange={(event) => handleChange(index, event.currentTarget.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => handlePaste(index, event)}
                  onFocus={(event) => {
                    setFocusIndex(index);
                    event.currentTarget.select();
                  }}
                  onBlur={() => setFocusIndex((current) => (current === index ? null : current))}
                />
                {/* Custom animated blinking caret for focused empty box */}
                {isFocused && !digit && (
                  <span className="lv-otp__caret" aria-hidden="true" />
                )}
              </div>

              {/* Elegant Middle Divider between 3rd and 4th digit */}
              {showSeparator && (
                <span className="lv-otp__divider" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>

      {hint && <p className="lv-otp__hint">{hint}</p>}
    </div>
  );
}

const css = /* css */ `
.lv-otp-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.lv-otp__container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  direction: ltr;
}

.lv-otp__box-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 58px;
  border-radius: 16px;
  border: 1.5px solid color-mix(in srgb, var(--line) 90%, transparent);
  background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 440px) {
  .lv-otp__box-wrap {
    width: 54px;
    height: 64px;
  }
}

.lv-otp__box-wrap:hover:not([data-disabled="true"]) {
  border-color: color-mix(in srgb, var(--brand) 45%, var(--line));
  transform: translateY(-1px);
}

.lv-otp__box-wrap[data-filled="true"] {
  border-color: color-mix(in srgb, var(--brand) 65%, var(--line));
  background: var(--surface);
  box-shadow: 0 6px 16px -2px rgba(112, 36, 89, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: lv-otp-pop 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.lv-otp__box-wrap[data-focused="true"] {
  border-color: var(--brand);
  background: var(--surface);
  box-shadow: 0 0 0 4px var(--brand-ring), 0 8px 24px -4px rgba(112, 36, 89, 0.25);
  transform: translateY(-2px) scale(1.04);
}

.lv-otp--invalid .lv-otp__box-wrap,
.lv-otp__box-wrap[data-invalid="true"] {
  border-color: var(--danger) !important;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--danger) 18%, transparent) !important;
  animation: lv-otp-shake 360ms ease-in-out;
}

.lv-otp__input {
  width: 100%;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 24px;
  font-weight: 900;
  text-align: center;
  font-variant-numeric: tabular-nums;
  caret-color: transparent; /* custom caret used */
  cursor: text;
}

.lv-otp__caret {
  position: absolute;
  width: 2px;
  height: 24px;
  border-radius: 2px;
  background: var(--brand);
  animation: lv-otp-blink 950ms ease-in-out infinite;
  pointer-events: none;
}

.lv-otp__divider {
  display: block;
  width: 8px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 40%, var(--line));
  margin-inline: 2px;
}

.lv-otp__hint {
  margin: 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted-2);
  direction: rtl;
}

@keyframes lv-otp-pop {
  0% { transform: scale(0.92); }
  60% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

@keyframes lv-otp-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes lv-otp-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@media (max-width: 380px) {
  .lv-otp__container { gap: 5px; }
  .lv-otp__box-wrap { width: 42px; height: 52px; border-radius: 12px; }
  .lv-otp__input { font-size: 20px; }
}
`;
