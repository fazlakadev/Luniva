"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // The inline theme script runs before hydration, so read the applied class after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));

    const onStorage = (event: StorageEvent) => {
      if (event.key === "luniva_theme") setDark(event.newValue === "dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("luniva_theme", next ? "dark" : "light");
  }

  const label = dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      onClick={toggle}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full border p-1 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]"
      style={{
        borderColor: dark ? "color-mix(in srgb, var(--brand) 45%, transparent)" : "var(--line-strong)",
        background: dark
          ? "color-mix(in srgb, var(--surface) 60%, transparent)"
          : "color-mix(in srgb, var(--surface) 78%, transparent)",
        boxShadow: dark ? "0 6px 20px rgba(0,0,0,.24)" : "0 6px 18px rgba(130,75,94,.10)",
      }}
    >
      <span
        className="relative inline-flex h-7 w-[3.25rem] shrink-0 items-center rounded-full transition-colors duration-300"
        style={{
          background: dark
            ? "linear-gradient(135deg, var(--brand-strong), var(--lav-strong))"
            : "linear-gradient(135deg, var(--brand-soft), var(--lav-soft))",
          boxShadow: "inset 0 1px 3px rgba(58,34,44,.10)",
        }}
      >
        <span
          aria-hidden="true"
          className="absolute right-[5px] grid h-5 w-5 place-items-center rounded-full transition-colors duration-300"
          style={{ color: dark ? "rgba(255,255,255,.5)" : "var(--brand-strong)" }}
        >
          <Sun size={12} />
        </span>
        <span
          aria-hidden="true"
          className="absolute left-[5px] grid h-5 w-5 place-items-center rounded-full transition-colors duration-300"
          style={{ color: dark ? "#fff" : "var(--muted-2)" }}
        >
          <Moon size={12} />
        </span>
        <span
          aria-hidden="true"
          className="absolute top-[3px] grid h-[22px] w-[22px] place-items-center rounded-full shadow-md transition-all duration-300 ease-out"
          style={{
            left: dark ? 3 : "calc(100% - 25px)",
            background: dark ? "var(--surface)" : "#fff",
            color: dark ? "var(--lav-strong)" : "var(--brand-strong)",
          }}
        >
          {dark ? <Moon size={13} /> : <Sun size={13} />}
        </span>
      </span>

      {showLabel && (
        <span className="hidden text-[11px] font-black sm:inline" style={{ color: "var(--muted)" }}>
          {dark ? "فاتح" : "داكن"}
        </span>
      )}
    </button>
  );
}
