"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ArrowLeft, Sparkles, X } from "lucide-react";

export const WELCOME_SESSION_KEY = "luniva_welcome_shown";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(WELCOME_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function getServerSnapshot() {
  return false;
}

export default function WelcomeDialog({ name }: { name: string }) {
  const shouldShow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const displayName = name.trim() || "مدير النظام";

  const close = useCallback(() => {
    try {
      window.sessionStorage.setItem(WELCOME_SESSION_KEY, "1");
    } catch {
      // Storage can be unavailable in private browsing; the dialog still closes.
    }
    notify();
  }, []);

  useEffect(() => {
    if (!shouldShow) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [shouldShow, close]);

  if (!shouldShow) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 print:hidden sm:p-4"
    >
      <button
        type="button"
        aria-label="إغلاق نافذة الترحيب"
        onClick={close}
        className="absolute inset-0 cursor-default bg-[#1c101c]/55 backdrop-blur-sm"
      />

      <div
        className="page-enter relative max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[1.75rem] border p-5 text-center shadow-2xl sm:p-9"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full opacity-70 blur-2xl"
          style={{ background: "var(--brand-soft)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full opacity-60 blur-2xl"
          style={{ background: "var(--lav-soft)" }}
        />

        <button
          type="button"
          onClick={close}
          autoFocus
          aria-label="إغلاق"
          className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl transition hover:bg-[var(--surface-3)]"
          style={{ color: "var(--muted)" }}
        >
          <X size={17} />
        </button>

        <div className="relative">
          <span
            className="mx-auto grid h-16 w-16 place-items-center rounded-3xl"
            style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
          >
            <Sparkles size={28} />
          </span>
          <p className="eyebrow mt-5">مرحبًا بك في لونيفا</p>
          <h2 id="welcome-title" className="page-title mt-2 text-2xl">
            أهلًا، <span className="break-words">{displayName}</span>
          </h2>
          <p id="welcome-description" className="page-subtitle mx-auto mt-3 max-w-xs text-sm leading-8">
            يسعدنا وجودك في مساحة العمل. كل ما تحتاجينه لإدارة المنتجات والبكدجات والفواتير والتحصيل جاهز بين يديك.
          </p>
          <button type="button" onClick={close} className="btn btn-primary mt-7 w-full py-3 text-sm">
            <ArrowLeft size={16} />البدء من مساحة العمل
          </button>
        </div>
      </div>
    </div>
  );
}
