"use client";

import { CloudMoon, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useId, useState } from "react";

export default function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [dark, setDark] = useState(false);
  const filterId = useId().replace(/:/g, "");

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
      className="luniva-theme-switch group inline-flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]"
      data-dark={dark ? "true" : "false"}
    >
      <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <defs>
          <filter id={`sketch-${filterId}`} x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence type="turbulence" baseFrequency="0.04 0.05" numOctaves={3} seed={42} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <span
        className="luniva-theme-switch__track"
        style={{ filter: `url(#sketch-${filterId})` }}
        aria-hidden="true"
      >
        <span className="luniva-theme-switch__rays" />
        <span className="luniva-theme-switch__clouds"><CloudMoon size={12} /></span>
        <span className="luniva-theme-switch__stars">
          <Sparkles size={11} />
          <Sparkles size={8} />
          <Sparkles size={7} />
        </span>
        <span className="luniva-theme-switch__shooting" />
        <span className="luniva-theme-switch__aurora" />
        <span className="luniva-theme-switch__sun">
          <Sun className="luniva-theme-switch__sun-icon" size={13} />
          <Moon className="luniva-theme-switch__moon-icon" size={13} />
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
