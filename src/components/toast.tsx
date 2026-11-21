"use client";

import { AlertCircle, CheckCircle2, Info, LoaderCircle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastTone = "loading" | "success" | "error" | "info";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastContextValue = {
  push: (input: ToastInput) => number;
  update: (id: number, patch: Partial<Omit<ToastItem, "id">>) => void;
  dismiss: (id: number) => void;
  loading: (title: string, description?: string) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  loading: LoaderCircle,
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const TONES: Record<ToastTone, { color: string; soft: string; border: string }> = {
  loading: { color: "var(--lav-strong)", soft: "var(--lav-soft)", border: "var(--lav)" },
  success: { color: "var(--success)", soft: "var(--success-soft)", border: "var(--success)" },
  error: { color: "var(--danger)", soft: "var(--danger-soft)", border: "var(--danger)" },
  info: { color: "var(--brand-strong)", soft: "var(--brand-soft)", border: "var(--brand)" },
};

const DEFAULT_DURATION = 3800;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const schedule = useCallback(
    (id: number, duration: number) => {
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        timers.current.delete(id);
        setToasts((items) => items.filter((item) => item.id !== id));
      }, duration);
      timers.current.set(id, timer);
    },
    [],
  );

  const push = useCallback(
    ({ title, description, tone = "info", duration }: ToastInput) => {
      const id = nextId.current++;
      setToasts((items) => [...items.slice(-3), { id, title, description, tone }]);
      if (tone !== "loading") schedule(id, duration ?? DEFAULT_DURATION);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: number, patch: Partial<Omit<ToastItem, "id">>) => {
      setToasts((items) =>
        items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      const tone = patch.tone;
      if (tone && tone !== "loading") schedule(id, DEFAULT_DURATION);
    },
    [schedule],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => clearTimeout(timer));
      active.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      update,
      dismiss,
      loading: (title, description) => push({ title, description, tone: "loading" }),
      success: (title, description) => push({ title, description, tone: "success" }),
      error: (title, description) => push({ title, description, tone: "error" }),
      info: (title, description) => push({ title, description, tone: "info" }),
    }),
    [push, update, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3 sm:top-5"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.tone];
          const tone = TONES[item.tone];
          return (
            <div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              className="toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl p-3.5 shadow-lg backdrop-blur-xl"
              style={{
                background: "color-mix(in srgb, var(--surface) 94%, transparent)",
                border: "1px solid var(--line)",
                borderInlineStartWidth: 4,
                borderInlineStartColor: tone.border,
                boxShadow: "var(--shadow-md)",
              }}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: tone.soft, color: tone.color }}
              >
                <Icon size={18} className={item.tone === "loading" ? "animate-spin" : undefined} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-extrabold leading-5" style={{ color: "var(--ink)" }}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-[11px] leading-5" style={{ color: "var(--muted)" }}>
                    {item.description}
                  </p>
                )}
              </div>
              {item.tone !== "loading" && (
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition hover:bg-[var(--surface-3)]"
                  style={{ color: "var(--muted-2)" }}
                  aria-label="إغلاق الإشعار"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      push: () => 0,
      update: () => {},
      dismiss: () => {},
      loading: () => 0,
      success: () => 0,
      error: () => 0,
      info: () => 0,
    };
  }
  return context;
}
