"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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
  const [revealed, setRevealed] = useState(false);
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

      <div className="luniva-welcome-scene page-enter">
        <div className={`luniva-welcome-card ${revealed ? "is-revealed" : ""}`}>
          <div className="luniva-welcome-card__front">
            <p className="eyebrow">مرحبًا بك في لونيفا</p>
            <span className="luniva-welcome-card__icon"><Sparkles size={26} /></span>
            <h2 id="welcome-title" className="luniva-welcome-card__title">
              أهلًا، <span className="break-words">{displayName}</span>
            </h2>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="luniva-welcome-card__more"
              aria-label="عرض رسالة الترحيب"
            >
              اكتشفي مساحتك <ArrowLeft size={14} />
            </button>
          </div>

          <div className="luniva-welcome-card__content">
            <p className="eyebrow">لونيفا · مساحة العمل</p>
            <p id="welcome-description" className="luniva-welcome-card__description">
              يسعدنا وجودك في مساحة العمل. كل ما تحتاجينه لإدارة المنتجات والبكدجات والفواتير والتحصيل جاهز بين يديك.
            </p>
            <button type="button" onClick={close} className="btn btn-primary w-full py-2.5 text-xs">
              <ArrowLeft size={16} />البدء من مساحة العمل
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={close}
          autoFocus
          aria-label="إغلاق"
          className="luniva-welcome-card__close"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
