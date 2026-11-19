"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import type { Tone } from "./types";

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

const TONE_LABELS: Record<Tone, string> = {
  accent: "وردي",
  success: "أخضر",
  warning: "برتقالي",
  danger: "أحمر",
  info: "بنفسجي",
  neutral: "رمادي",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
  block?: boolean;
  startIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  startIcon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "mors-btn",
        `mors-btn--${variant}`,
        `mors-btn--${size}`,
        block && "mors-btn--block",
        className,
      )}
      {...rest}
    >
      {startIcon}
      {children}
    </button>
  );
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "outline";
  size?: "sm" | "md";
};

export function IconButton({
  label,
  icon,
  variant = "outline",
  size = "sm",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx("mors-icon-btn", `mors-icon-btn--${variant}`, `mors-icon-btn--${size}`, className)}
      {...rest}
    >
      {icon}
    </button>
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: "flat" | "raised";
  padding?: "sm" | "md";
};

export function Card({ elevation = "flat", padding = "md", className, children, ...rest }: CardProps) {
  return (
    <div className={cx("mors-card", `mors-card--${elevation}`, `mors-card--${padding}`, className)} {...rest}>
      {children}
    </div>
  );
}

type IconName = "chevron-left" | "chevron-right" | "plus" | "edit" | "trash";

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  if (name === "chevron-left") return <ChevronLeft size={size} />;
  if (name === "chevron-right") return <ChevronRight size={size} />;
  if (name === "plus") return <Plus size={size} />;
  if (name === "edit") return <Pencil size={size} />;
  return <Trash2 size={size} />;
}

export function Swatch({ tone, size = "md" }: { tone: Tone; size?: "sm" | "md" }) {
  return <span className={cx("mors-swatch", `mors-swatch--${tone}`, size === "sm" && "mors-swatch--sm")} aria-hidden="true" />;
}

export function SwatchGroup({
  value,
  onChange,
  label = "اللون",
  size = "md",
}: {
  value: Tone;
  onChange: (tone: Tone) => void;
  label?: string;
  size?: "sm" | "md";
  block?: boolean;
}) {
  const tones = Object.keys(TONE_LABELS) as Tone[];
  return (
    <div className="mors-field" role="group" aria-label={label}>
      <span className="mors-field-label">{label}</span>
      <div className="mors-swatch-group">
        {tones.map((tone) => (
          <button
            key={tone}
            type="button"
            className="mors-swatch-btn"
            data-active={value === tone ? "true" : undefined}
            aria-label={TONE_LABELS[tone]}
            aria-pressed={value === tone}
            onClick={() => onChange(tone)}
          >
            <Swatch tone={tone} size={size} />
          </button>
        ))}
      </div>
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  size?: "sm" | "md";
};

export function TextField({ label, size = "md", className, ...rest }: TextFieldProps) {
  return (
    <label className="mors-field">
      <span className="mors-field-label">{label}</span>
      <input className={cx("mors-input", size === "sm" && "mors-input--sm", className)} {...rest} />
    </label>
  );
}
