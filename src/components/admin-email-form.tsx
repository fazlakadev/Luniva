"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MailCheck,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import OtpInput from "@/components/ui/otp-input";
import { useToast } from "@/components/toast";

const RESEND_SECONDS = 25;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Stage = "idle" | "current" | "new";

type Challenge = {
  id: string;
  token: string;
  email: string;
};

export default function AdminEmailForm({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const toast = useToast();

  const [currentEmail, setCurrentEmail] = useState(adminEmail);
  const [stage, setStage] = useState<Stage>("idle");
  const [nextEmail, setNextEmail] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  function reset() {
    setStage("idle");
    setChallenge(null);
    setCode("");
    setError("");
    setNotice("");
    setResendIn(0);
    setBusy(false);
    setResending(false);
  }

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = nextEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setError("أدخلي بريدًا إلكترونيًا صالحًا.");
      return;
    }
    if (email === currentEmail.trim().toLowerCase()) {
      setError("البريد الجديد مطابق للبريد الحالي.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذّر بدء تغيير البريد.");

      setChallenge({ id: String(data.challengeId), token: String(data.token), email: String(data.email ?? "") });
      setStage("current");
      setCode("");
      setResendIn(RESEND_SECONDS);
      setNotice("أرسلنا رمز تفويض إلى بريدك الحالي. أدخليه للمتابعة.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر بدء تغيير البريد.");
    } finally {
      setBusy(false);
    }
  }

  const verify = useCallback(
    async (value: string) => {
      if (!challenge || busy) return;
      if (value.length !== 6) {
        setError("أدخلي رمز التحقق المكوّن من 6 أرقام.");
        return;
      }
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const endpoint = stage === "current" ? "/api/auth/email/verify-current" : "/api/auth/email/verify-new";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: challenge.id, token: challenge.token, code: value }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.code === "expired" || data.code === "locked") {
            setCode("");
            setChallenge(null);
            setStage("idle");
            setResendIn(0);
          }
          throw new Error(data.error || "الرمز غير صحيح.");
        }

        if (stage === "current") {
          setChallenge({ id: String(data.challengeId), token: String(data.token), email: String(data.email ?? "") });
          setStage("new");
          setCode("");
          setResendIn(RESEND_SECONDS);
          setNotice("تم تفويض التغيير. أرسلنا رمز تأكيد إلى البريد الجديد.");
          setBusy(false);
          return;
        }

        const saved = String(data.email ?? nextEmail);
        setCurrentEmail(saved);
        setNextEmail("");
        setStage("idle");
        setChallenge(null);
        setCode("");
        setResendIn(0);
        setNotice("");
        toast.success("تم تحديث بريد الإدارة", "سيصل رمز الدخول القادم إلى البريد الجديد بعد تأكيده.");
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "تعذّر التحقق من الرمز.");
      } finally {
        setBusy(false);
      }
    },
    [busy, challenge, nextEmail, router, stage, toast],
  );

  async function resend() {
    if (!challenge || resending || resendIn > 0) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          token: challenge.token,
          purpose: stage === "current" ? "email_current" : "email_new",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === "expired") {
          reset();
        }
        throw new Error(data.error || "تعذّر إرسال رمز جديد.");
      }
      setCode("");
      setNotice("أرسلنا رمزًا جديدًا.");
      setResendIn(RESEND_SECONDS);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر إرسال رمز جديد.");
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="app-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <MailCheck size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">بريد التحقق للإدارة</h2>
          <p className="text-[11px] muted">
            يستقبل رمز الدخول بخطوتين. لا يمكن تغييره إلا بعد تأكيد البريد الحالي ثم البريد الجديد.
          </p>
        </div>
      </div>

      <div
        className="mt-5 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: "var(--surface)", color: "var(--brand-strong)", border: "1px solid var(--line)" }}
        >
          <Mail size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>البريد الحالي</p>
          <p className="truncate text-sm font-extrabold" dir="ltr" style={{ color: "var(--ink)" }}>
            {currentEmail || "—"}
          </p>
        </div>
      </div>

      {stage === "idle" ? (
        <form onSubmit={start} className="mt-5 space-y-4">
          <label>
            <span className="field-label">البريد الإلكتروني الجديد</span>
            <input
              value={nextEmail}
              onChange={(event) => {
                setNextEmail(event.target.value);
                if (error) setError("");
              }}
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              dir="ltr"
              className="field text-left"
              placeholder="name@example.com"
              disabled={busy}
            />
            <span className="field-hint">سنرسل رمز تفويض إلى البريد الحالي أولًا، ثم رمز تأكيد إلى البريد الجديد.</span>
          </label>

          {error && <EmailError message={error} />}

          <button type="submit" disabled={busy} className="btn btn-primary w-full sm:w-auto">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Save size={16} />
            )}
            إرسال رمز التفويض
          </button>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <div
            className="flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
            >
              <ShieldCheck size={16} />
            </span>
            <div className="min-w-0 text-[11px] leading-6" style={{ color: "var(--muted)" }}>
              {stage === "current" ? (
                <>
                  أدخلي رمز <strong style={{ color: "var(--ink)" }}>تفويض التغيير</strong> المرسل إلى{" "}
                  <span dir="ltr" className="font-extrabold" style={{ color: "var(--brand-strong)" }}>
                    {challenge?.email || "بريدك الحالي"}
                  </span>
                </>
              ) : (
                <>
                  أدخلي رمز <strong style={{ color: "var(--ink)" }}>تأكيد الملكية</strong> المرسل إلى البريد الجديد{" "}
                  <span dir="ltr" className="font-extrabold" style={{ color: "var(--brand-strong)" }}>
                    {challenge?.email || nextEmail}
                  </span>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="field-label mb-2 text-center">رمز التحقق</p>
            <OtpInput
              value={code}
              onChange={(next) => {
                setCode(next);
                if (error) setError("");
              }}
              onComplete={(next) => void verify(next)}
              disabled={busy}
              invalid={Boolean(error)}
              autoFocus
              hint={stage === "current" ? "تأكيد البريد الحالي · صالح 10 دقائق" : "تأكيد البريد الجديد · صالح 15 دقيقة"}
            />
          </div>

          {error && <EmailError message={error} />}
          {notice && !error && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold leading-6"
              style={{
                background: "var(--success-soft)",
                color: "var(--success)",
                border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
              }}
            >
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-bold transition hover:bg-[var(--surface-3)] disabled:opacity-50"
              style={{ color: "var(--muted)" }}
            >
              <ArrowRight size={13} />
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resending || busy || resendIn > 0}
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-bold transition hover:bg-[var(--surface-3)] disabled:opacity-50"
              style={{ color: "var(--brand-strong)" }}
            >
              <RefreshCw size={13} className={resending ? "animate-spin" : undefined} />
              {resending ? "جارِ الإرسال..." : resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ث` : "إعادة إرسال الرمز"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function EmailError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold leading-6"
      style={{
        background: "var(--danger-soft)",
        color: "var(--danger)",
        border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
      }}
    >
      <span
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]"
        style={{ background: "var(--surface)" }}
      >
        !
      </span>
      <span>{message}</span>
    </div>
  );
}
