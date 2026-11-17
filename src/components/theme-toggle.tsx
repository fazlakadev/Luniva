"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [dark, setDark] = useState(false);
  // Read the theme applied by the inline script after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("luniva_theme", next ? "dark" : "light");
  }
  return <button onClick={toggle} aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"} title={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"} className="group flex h-11 items-center gap-2 rounded-2xl border border-[#e8d6dc] bg-gradient-to-l from-white to-[#fff6f8] px-3 text-[#8f6573] shadow-[0_5px_16px_rgba(130,75,94,.08)] transition duration-300 hover:-translate-y-0.5 hover:border-[#d9b5c0] dark:border-white/10 dark:from-[#33272d] dark:to-[#251e23] dark:text-[#f2cbd4]">
    <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#f2dce2] text-[#9c5369] shadow-sm dark:bg-[#5a3946] dark:text-[#ffe0e8]">{dark ? <Sun size={16} /> : <Moon size={16} />}</span>
    {showLabel && <span className="hidden text-xs font-extrabold sm:inline">{dark ? "مظهر فاتح" : "مظهر داكن"}</span>}
  </button>;
}
