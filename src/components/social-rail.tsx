"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  AtSign,
  Globe,
  Headphones,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from "lucide-react";

type SocialRailProps = {
  email?: string;
  phone?: string;
};

const ease = [0.16, 1, 0.3, 1] as const;

export default function SocialRail({ email = "", phone = "" }: SocialRailProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();

  const phoneDigits = phone.replace(/[^\d]/g, "");

  const links = [
    {
      title: "واتساب لونيفا",
      subtitle: "محادثة مباشرة وسريعة",
      href: phoneDigits ? `https://wa.me/${phoneDigits}` : "/contact",
      icon: MessageCircle,
      accent: "#25D366",
      bg: "rgba(37, 211, 102, 0.12)",
      border: "rgba(37, 211, 102, 0.28)",
      badge: "فوري",
    },
    {
      title: "اتصال هاتفي",
      subtitle: phone || "تواصل هاتفي مباشر",
      href: phoneDigits ? `tel:+${phoneDigits}` : "/contact",
      icon: Phone,
      accent: "#f472b6",
      bg: "rgba(244, 114, 182, 0.12)",
      border: "rgba(244, 114, 182, 0.25)",
      badge: null,
    },
    {
      title: "البريد الإلكتروني",
      subtitle: email || "رد رسمي خلال ساعات",
      href: email ? `mailto:${email}` : "/contact",
      icon: AtSign,
      accent: "#c084fc",
      bg: "rgba(192, 132, 252, 0.12)",
      border: "rgba(192, 132, 252, 0.25)",
      badge: null,
    },
    {
      title: "صفحة الدعم والتواصل",
      subtitle: "الأسئلة الشائعة والنموذج",
      href: "/contact",
      icon: Globe,
      accent: "#fb7185",
      bg: "rgba(251, 113, 133, 0.12)",
      border: "rgba(251, 113, 133, 0.25)",
      badge: null,
    },
  ];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className="fixed left-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 print:hidden flex flex-col items-start gap-2.5 pointer-events-none"
    >
      {/* Animated Popover Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="social-card"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.94 }}
            transition={{ duration: reduced ? 0 : 0.35, ease }}
            className="pointer-events-auto relative w-[min(90vw,20rem)] overflow-hidden rounded-[1.6rem] border shadow-2xl backdrop-blur-2xl"
            style={{
              borderColor: "color-mix(in srgb, var(--brand) 45%, transparent)",
              background: "linear-gradient(165deg, rgba(38, 14, 28, 0.96) 0%, rgba(20, 6, 16, 0.98) 100%)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 24px -4px rgba(112, 36, 89, 0.35)",
            }}
          >
            {/* Ambient Background Aura */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
              style={{ background: "var(--brand)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
              style={{ background: "var(--lav)" }}
            />

            {/* Card Header with Perfectly Centered Close Button */}
            <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-strong))" }}
                >
                  <Headphones size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">تواصلي مع لونيفا</p>
                  <p className="truncate text-[10px] font-bold text-white/60">خدمة عملاء راقية وسريعة</p>
                </div>
              </div>

              {/* Improved Centered Close Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white active:scale-90"
                aria-label="إغلاق نافذة التواصل"
                title="إغلاق"
              >
                <X size={14} />
              </button>
            </div>

            {/* Contact Links List */}
            <div className="relative p-2.5 space-y-1.5">
              {links.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.a
                    key={item.title}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    initial={reduced ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: reduced ? 0 : 0.05 * idx, ease }}
                    className="group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all duration-200 hover:-translate-x-1 hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.98]"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                        style={{
                          background: item.bg,
                          border: `1px solid ${item.border}`,
                          color: item.accent,
                        }}
                      >
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-extrabold text-white group-hover:text-pink-200">
                            {item.title}
                          </p>
                          {item.badge && (
                            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8.5px] font-black text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] font-medium text-white/55">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <ArrowLeft
                      size={14}
                      className="shrink-0 text-white/30 transition-all duration-200 group-hover:-translate-x-1 group-hover:text-white"
                    />
                  </motion.a>
                );
              })}
            </div>

            {/* Card Footer */}
            <div className="relative border-t border-white/10 px-4 py-2.5 text-center">
              <p className="flex items-center justify-center gap-1.5 text-[9.5px] font-bold text-white/50">
                <Sparkles size={11} className="text-pink-300" />
                لونيفا · نحرص على تقديم أفضل تجربة دائماً
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        type="button"
        onClick={() => setOpen((current) => !current)}
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
        aria-expanded={open}
        aria-label={open ? "إغلاق نافذة التواصل" : "تواصل معنا"}
        title={open ? "إغلاق نافذة التواصل" : "تواصل معنا"}
        className="pointer-events-auto group relative flex items-center gap-2 rounded-full border px-4 py-2.5 text-white shadow-xl transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, var(--brand-strong), var(--plum))",
          borderColor: "color-mix(in srgb, var(--brand) 55%, transparent)",
          boxShadow: open
            ? "0 10px 25px -4px rgba(112, 36, 89, 0.6)"
            : "0 10px 25px -4px rgba(112, 36, 89, 0.45), 0 0 16px -2px rgba(220, 100, 160, 0.35)",
        }}
      >
        <span className="relative grid h-5 w-5 place-items-center">
          <motion.span
            animate={{ rotate: open ? 90 : 0, scale: open ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <MessageCircle size={19} />
          </motion.span>
          <motion.span
            animate={{ rotate: open ? 0 : -90, scale: open ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute"
          >
            <X size={19} />
          </motion.span>
        </span>
        <span className="text-xs font-black tracking-tight select-none">
          {open ? "إغلاق" : "تواصل معنا"}
        </span>
      </motion.button>
    </div>
  );
}
