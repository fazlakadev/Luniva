"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  Calendar,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

const ease = [0.16, 1, 0.3, 1] as const;

interface AdminFloatingMenuProps {
  onLogout: () => Promise<void> | void;
  onOpenSidebar?: () => void;
}

const ADMIN_LINKS = [
  { href: "/workspace", label: "مساحة العمل", desc: "الرئيسية", icon: LayoutDashboard },
  { href: "/invoices", label: "الفواتير", desc: "الإصدار والتحصيل", icon: Receipt },
  { href: "/customers", label: "العملاء", desc: "الملفات والأرقام", icon: Users },
  { href: "/products", label: "المنتجات", desc: "الكتالوج والقطع", icon: Package },
  { href: "/inventory", label: "المخزون", desc: "التحليلات والتنبيهات", icon: Boxes },
  { href: "/packages", label: "البكدجات", desc: "العروض المجمعة", icon: Gift },
  { href: "/payments", label: "المدفوعات", desc: "سجل السداد", icon: CreditCard },
  { href: "/profits", label: "الأرباح", desc: "صافي الأرباح", icon: TrendingUp },
  { href: "/reports", label: "التقارير", desc: "التحليلات والمبيعات", icon: BarChart3 },
  { href: "/appointments", label: "المواعيد", desc: "جدول المواعيد", icon: Calendar },
  { href: "/suppliers", label: "الموردين", desc: "حسابات الموردين", icon: Truck },
  { href: "/settings", label: "الإعدادات", desc: "بيانات المنشأة", icon: Settings },
];

export default function AdminFloatingMenu({ onLogout }: AdminFloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname() || "/workspace";
  const reduced = !!useReducedMotion();

  const isActive = (href: string) =>
    pathname === href || (href !== "/workspace" && pathname.startsWith(href));

  const navigate = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className="fixed left-1/2 -translate-x-1/2 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 xl:hidden print:hidden flex flex-col items-center pointer-events-none"
    >
      {/* Animated Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="admin-card"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
            transition={{ duration: reduced ? 0 : 0.35, ease }}
            className="pointer-events-auto relative mb-3 w-[min(92vw,22.5rem)] overflow-hidden rounded-[1.75rem] border shadow-2xl backdrop-blur-2xl"
            style={{
              borderColor: "rgba(216, 180, 254, 0.4)",
              background: "linear-gradient(165deg, rgba(38, 12, 38, 0.97) 0%, rgba(20, 5, 22, 0.98) 100%)",
              boxShadow: "0 25px 60px -10px rgba(0, 0, 0, 0.75), 0 0 35px -5px rgba(168, 85, 247, 0.35)",
            }}
          >
            {/* Ambient Background Glows */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-35 blur-3xl"
              style={{ background: "#a855f7" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
              style={{ background: "#ec4899" }}
            />

            {/* Panel Header */}
            <div className="relative flex items-center justify-between border-b border-purple-400/20 px-4 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}
                >
                  <ShieldCheck size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">لوحة تحكم لونيفا</p>
                  <p className="truncate text-[10px] font-bold text-purple-300">الإدارة السريعة الشاملة</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-purple-300/20 bg-purple-500/15 text-purple-200 transition hover:bg-purple-500/30 hover:text-white active:scale-90"
                aria-label="إغلاق القائمة"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Action: New Invoice CTA */}
            <div className="relative p-3 pb-1">
              <Link
                href="/invoices/new"
                onClick={() => setIsOpen(false)}
                className="group flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-black text-white shadow-lg transition active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #db2777)",
                  boxShadow: "0 6px 20px -3px rgba(168, 85, 247, 0.5)",
                }}
              >
                <Plus size={16} className="transition-transform group-hover:rotate-90 duration-300" />
                <span>إصدار فاتورة جديدة +</span>
              </Link>
            </div>

            {/* Admin Grid */}
            <div
              className="relative max-h-[52vh] overflow-y-auto overscroll-contain p-3 pt-1.5 space-y-1.5"
              data-lenis-prevent
              data-lenis-prevent-wheel
            >
              <div className="grid grid-cols-2 gap-1.5">
                {ADMIN_LINKS.map(({ href, label, desc, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <button
                      key={href}
                      type="button"
                      onClick={() => navigate(href)}
                      className="group flex items-center gap-2.5 rounded-xl border p-2 text-right transition-all duration-200 active:scale-95"
                      style={{
                        background: active
                          ? "rgba(168, 85, 247, 0.28)"
                          : "rgba(255, 255, 255, 0.04)",
                        borderColor: active
                          ? "rgba(216, 180, 254, 0.55)"
                          : "rgba(255, 255, 255, 0.08)",
                        boxShadow: active
                          ? "0 4px 12px -2px rgba(168, 85, 247, 0.3)"
                          : "none",
                      }}
                    >
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-110"
                        style={{
                          background: active
                            ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                            : "rgba(255, 255, 255, 0.08)",
                          color: "#fff",
                        }}
                      >
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="truncate text-[11.5px] font-black"
                          style={{ color: active ? "#ffffff" : "#f3e8ff" }}
                        >
                          {label}
                        </p>
                        <p className="truncate text-[9px] font-medium text-purple-300/70">
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel Utilities Footer */}
            <div className="relative flex items-center justify-between border-t border-purple-400/20 bg-purple-950/40 px-3.5 py-2.5 text-[10px]">
              <Link
                href="/"
                target="_blank"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1.5 rounded-lg border border-purple-300/25 bg-white/5 px-2.5 py-1.5 font-bold text-purple-200 transition hover:bg-white/10 active:scale-95"
              >
                <ExternalLink size={12} />
                معاينة المتجر
              </Link>

              <div className="flex items-center gap-2">
                <ThemeToggle showLabel={false} />
                <button
                  type="button"
                  onClick={async () => {
                    setIsOpen(false);
                    await onLogout();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-400/35 bg-rose-500/20 px-2.5 py-1.5 font-black text-rose-200 transition hover:bg-rose-500/30 active:scale-95"
                  title="تسجيل الخروج"
                >
                  <LogOut size={12} />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Executive Collapsed Pill Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={reduced ? undefined : { scale: 1.04, y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        aria-expanded={isOpen}
        aria-label={isOpen ? "إغلاق لوحة التحكم" : "فتح لوحة التحكم"}
        title={isOpen ? "إغلاق لوحة التحكم" : "لوحة التحكم"}
        className="pointer-events-auto group relative flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-white shadow-2xl backdrop-blur-xl transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.95) 0%, rgba(88, 28, 135, 0.98) 55%, rgba(112, 36, 89, 0.95) 100%)",
          borderColor: "rgba(216, 180, 254, 0.45)",
          boxShadow: isOpen
            ? "0 12px 30px -4px rgba(88, 28, 135, 0.7)"
            : "0 12px 30px -4px rgba(88, 28, 135, 0.55), 0 0 20px -2px rgba(168, 85, 247, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
        }}
      >
        {/* Glow emblem icon */}
        <span
          className="grid h-6 w-6 place-items-center rounded-lg shadow-sm text-purple-100"
          style={{
            background: "rgba(255, 255, 255, 0.16)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
          }}
        >
          <Sparkles size={13} className="text-purple-200" />
        </span>

        {/* Text and status dot */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black tracking-tight select-none">
            لوحة الإدارة
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </div>

        {/* Dynamic Chevron / Toggle indicator */}
        <span
          className="grid h-5 w-5 place-items-center rounded-full text-purple-200 transition-transform duration-300"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <ChevronDown size={14} />
        </span>
      </motion.button>
    </div>
  );
}
