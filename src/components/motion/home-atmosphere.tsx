"use client";

/** A lightweight, GPU-composited atmospheric glow layer behind the homepage. */
export default function HomeAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-60"
      style={{
        background:
          "radial-gradient(circle at 18% 22%, var(--brand-soft) 0%, transparent 45%), radial-gradient(circle at 82% 65%, var(--lav-soft) 0%, transparent 48%)",
      }}
    />
  );
}
