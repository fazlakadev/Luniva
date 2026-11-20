"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  CreditCard,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Receipt,
  Settings,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

const ease = [0.22, 1, 0.36, 1] as const;

interface AdminFloatingMenuProps {
  onLogout: () => Promise<void> | void;
  onOpenSidebar?: () => void;
}

const ADMIN_LINKS = [
  { href: "/workspace", label: "مساحة العمل", icon: LayoutDashboard },
  { href: "/invoices", label: "الفواتير", icon: Receipt },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/packages", label: "البكدجات", icon: Gift },
  { href: "/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/profits", label: "الأرباح", icon: TrendingUp },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/appointments", label: "المواعيد", icon: Calendar },
  { href: "/suppliers", label: "الموردين", icon: Truck },
  { href: "/settings", label: "الإعدادات", icon: Settings },
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
    <motion.div
      ref={containerRef}
      dir="rtl"
      className="fixed left-1/2 z-[100] xl:hidden print:hidden"
      style={{
        x: "-50%",
        bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        pointerEvents: "auto",
      }}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.4, ease }}
    >
      <motion.div
        className="relative overflow-hidden flex flex-col shadow-2xl"
        style={{
          fontFamily: "'Aeonik TRIAL', 'Inter', system-ui, sans-serif",
          cursor: isOpen ? "default" : "pointer",
        }}
        animate={{
          width: isOpen ? 320 : 160,
          height: isOpen ? 450 : 48,
          borderRadius: isOpen ? 28 : 72,
          scale: 1,
        }}
        whileHover={isOpen || reduced ? undefined : { scale: 1.04 }}
        transition={{
          duration: reduced ? 0 : 0.65,
          ease,
          height: { duration: reduced ? 0 : isOpen ? 0.65 : 0.2 },
          scale: { duration: reduced ? 0 : 0.25, ease },
        }}
      >
        {/* Purple background layer */}
        <motion.div
          className="absolute inset-0"
          animate={{
            backgroundColor: isOpen ? "#4a1240" : "#702459",
            borderColor: isOpen ? "#a855f7" : "#c084fc",
          }}
          transition={{ duration: reduced ? 0 : isOpen ? 0.15 : 0.3, ease }}
          style={{
            borderWidth: 1.5,
            borderStyle: "solid",
            borderRadius: "inherit",
            boxShadow: "0 10px 30px -5px rgba(112, 36, 89, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
          }}
        />

        {/* Deep dark purple circle expanding from bottom */}
        <motion.div
          className="absolute left-1/2"
          style={{
            width: "220%",
            height: "220%",
            borderRadius: "50%",
            x: "-50%",
            background: "radial-gradient(circle at 50% 20%, #2f0d28 0%, #190516 100%)",
          }}
          animate={{ bottom: isOpen ? "-20%" : "-220%" }}
          transition={{
            duration: reduced ? 0 : 0.65,
            ease,
            delay: reduced ? 0 : isOpen ? 0.08 : 0,
          }}
        />

        {/* Menu content when open */}
        <div
          className="relative z-10 flex flex-1 flex-col overflow-hidden p-3.5"
          style={{
            pointerEvents: isOpen ? "auto" : "none",
            opacity: isOpen ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-400/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/30 text-purple-200">
                <Sparkles size={14} />
              </span>
              <div>
                <p className="text-xs font-black text-white">لوحة التحكم</p>
                <p className="text-[9.5px] font-bold text-purple-300">لونيفا · الإدارة</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg border border-purple-400/30 text-purple-200 transition hover:bg-purple-500/20 active:scale-95"
              aria-label="إغلاق"
            >
              <X size={15} />
            </button>
          </div>

          {/* Quick Action: New Invoice CTA */}
          <Link
            href="/invoices/new"
            onClick={() => setIsOpen(false)}
            className="my-2.5 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-black text-white shadow-lg transition active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #a855f7, #ec4899)",
              boxShadow: "0 4px 15px -2px rgba(168, 85, 247, 0.45)",
            }}
          >
            <Plus size={15} />
            فاتورة جديدة
          </Link>

          {/* Scrollable Navigation Grid */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain pr-0.5 space-y-1"
            data-lenis-prevent
            data-lenis-prevent-wheel
          >
            <div className="grid grid-cols-2 gap-1.5">
              {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <button
                    key={href}
                    type="button"
                    onClick={() => navigate(href)}
                    className="flex items-center gap-2 rounded-xl border p-2 text-right transition active:scale-95"
                    style={{
                      background: active
                        ? "rgba(168, 85, 247, 0.28)"
                        : "rgba(255, 255, 255, 0.05)",
                      borderColor: active
                        ? "rgba(192, 132, 252, 0.55)"
                        : "rgba(255, 255, 255, 0.1)",
                      color: active ? "#ffffff" : "#e9d5ff",
                    }}
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: active
                          ? "#a855f7"
                          : "rgba(255, 255, 255, 0.1)",
                        color: "#fff",
                      }}
                    >
                      <Icon size={13} />
                    </span>
                    <span className="truncate text-[11px] font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Utilities */}
          <div className="mt-2.5 flex items-center justify-between border-t border-purple-400/20 pt-2 text-[10px]">
            <Link
              href="/"
              target="_blank"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 rounded-lg border border-purple-400/25 px-2 py-1 text-purple-200 transition hover:bg-purple-500/20"
            >
              <ExternalLink size={12} />
              معاينة الموقع
            </Link>

            <div className="flex items-center gap-1.5">
              <ThemeToggle showLabel={false} />
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false);
                  await onLogout();
                }}
                className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/15 px-2 py-1 font-bold text-rose-200 transition hover:bg-rose-500/25 active:scale-95"
                title="تسجيل الخروج"
              >
                <LogOut size={12} />
                خروج
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed Pill button bar */}
        <button
          type="button"
          aria-label={isOpen ? "إغلاق لوحة التحكم" : "فتح لوحة التحكم"}
          aria-expanded={isOpen}
          className="relative z-10 flex w-full shrink-0 cursor-pointer appearance-none items-center justify-between border-0 bg-transparent px-4"
          onClick={() => setIsOpen((value) => !value)}
          style={{ height: 48 }}
        >
          <span className="flex items-center gap-1.5 text-xs font-black text-white">
            <Sparkles size={15} className="text-purple-200" />
            {isOpen ? "لوحة التحكم" : "لوحة التحكم"}
          </span>

          <div className="relative flex h-[24px] w-[24px] items-center justify-center">
            <motion.span
              className="absolute block h-[2px] w-[18px] rounded-full bg-white"
              animate={{
                rotate: isOpen ? 45 : 0,
                y: isOpen ? 0 : -3,
              }}
              transition={{ duration: reduced ? 0 : 0.35, ease }}
            />
            <motion.span
              className="absolute block h-[2px] w-[18px] rounded-full bg-white"
              animate={{
                rotate: isOpen ? -45 : 0,
                y: isOpen ? 0 : 3,
              }}
              transition={{ duration: reduced ? 0 : 0.35, ease }}
            />
          </div>
        </button>
      </motion.div>
    </motion.div>
  );
}
