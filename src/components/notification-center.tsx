"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  CalendarClock,
  CircleAlert,
  Coins,
  AlertTriangle,
  Receipt,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";
import type { NotificationCategory, NotificationRecord } from "@/lib/notification-types";

const CATEGORY_TABS: Array<{ id: "all" | NotificationCategory; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "sales", label: "المبيعات" },
  { id: "inventory", label: "المخزون" },
  { id: "appointment", label: "المواعيد" },
];

function timeAgo(dateString: string): string {
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return "الآن";
  if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
  if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} أيام`;
  return new Intl.DateTimeFormat("ar-EG", { month: "short", day: "numeric" }).format(new Date(dateString));
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | NotificationCategory>("all");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45_000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
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

  const markAllRead = async () => {
    try {
      setLoading(true);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === "all") return true;
    return n.category === activeTab;
  });

  const getCategoryIcon = (n: NotificationRecord) => {
    if (n.category === "sales") {
      return (
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Receipt size={16} />
        </span>
      );
    }
    if (n.category === "inventory") {
      return (
        <span
          className={`grid h-8 w-8 place-items-center rounded-xl ${
            n.severity === "danger"
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          }`}
        >
          <AlertTriangle size={16} />
        </span>
      );
    }
    if (n.category === "appointment") {
      return (
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
          <CalendarClock size={16} />
        </span>
      );
    }
    return (
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
        <CircleAlert size={16} />
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative inline-block" dir="rtl">
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="مركز الإشعارات"
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink)] shadow-sm transition hover:bg-[var(--surface-3)] active:scale-95"
      >
        <Bell size={16} className={unreadCount > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? "+99" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl z-50 overflow-hidden"
            style={{
              backdropFilter: "blur(20px)",
              background: "color-mix(in srgb, var(--surface) 97%, transparent)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] p-3.5 bg-[var(--surface-2)]/60">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles size={14} />
                </span>
                <div>
                  <h3 className="text-xs font-black text-ink">مركز التنبيهات</h3>
                  <p className="text-[10px] font-medium text-muted">
                    {unreadCount > 0 ? `${unreadCount} تنبيه غير مقروء` : "جميع التنبيهات مقروءة"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition"
                    title="تحديد الكل كمقروء"
                  >
                    <CheckCheck size={13} />
                    <span>قراءة الكل</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:text-ink hover:bg-[var(--surface-3)] transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--line)] p-1.5 bg-[var(--surface-2)]/30">
              {CATEGORY_TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? notifications.filter((n) => !n.read).length
                    : notifications.filter((n) => n.category === tab.id && !n.read).length;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 px-2 text-[11px] font-bold transition ${
                      active
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-muted hover:text-ink hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-black ${
                          active ? "bg-white text-purple-700" : "bg-purple-500/20 text-purple-600 dark:text-purple-300"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notifications Scroll List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--line)]">
              {filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-2)] text-muted">
                    <Check size={20} className="text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-ink">لا توجد تنبيهات جديدة</p>
                  <p className="text-[11px] text-muted mt-0.5">أنت على اطلاع بكل المستجدات أولاً بأول</p>
                </div>
              ) : (
                filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.read && markOneRead(item.id)}
                    className={`group relative flex items-start gap-3 p-3 transition ${
                      item.read
                        ? "bg-transparent opacity-80 hover:opacity-100 hover:bg-[var(--surface-2)]/50"
                        : "bg-purple-500/5 hover:bg-purple-500/10"
                    }`}
                  >
                    {!item.read && (
                      <span className="absolute top-4 right-1.5 h-1.5 w-1.5 rounded-full bg-purple-500" />
                    )}

                    {getCategoryIcon(item)}

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-ink truncate">{item.title}</h4>
                        <span className="text-[9.5px] font-semibold text-muted whitespace-nowrap">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-muted line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>

                      {item.link && (
                        <div className="mt-2 flex items-center justify-between">
                          <Link
                            href={item.link}
                            onClick={() => {
                              if (!item.read) markOneRead(item.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            <span>عرض التفاصيل</span>
                            <ExternalLink size={11} />
                          </Link>

                          {!item.read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markOneRead(item.id);
                              }}
                              className="text-[10px] text-muted hover:text-ink transition"
                            >
                              تعيين كمقروء
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with quick navigation */}
            <div className="border-t border-[var(--line)] p-2.5 bg-[var(--surface-2)]/60 text-center">
              <Link
                href="/reports"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-muted hover:text-ink transition"
              >
                عرض لوحة التقارير والتحليلات الشاملة ←
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
