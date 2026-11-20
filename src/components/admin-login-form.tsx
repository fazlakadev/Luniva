"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import OtpInput from "@/components/ui/otp-input";
import { WELCOME_SESSION_KEY } from "@/components/welcome-dialog";

const highlights = [
  { icon: UsersRound, title: "دليل عملاء متكامل", text: "ملفات، أرقام تواصل، وكشوفات حساب مفصلة." },
  { icon: Layers3, title: "إدارة المنتجات والمتغيرات", text: "ألوان ومقاسات وصور مع تسعير نهائي." },
  { icon: Gift, title: "بكدجات وعروض ذكية", text: "توليفات تلقائية بحساب الخصومات والتوفير." },
];

const RESEND_SECONDS = 30;

type Challenge = {
  id: string;
  token: string;
  email: string;
  expiresAt: string;
};

export default function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  function syncCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
          remember: form.get("remember") === "on",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.stage !== "otp") {
        throw new Error(body.error || "تعذّر تسجيل الدخول. تحققي من البيانات المدخلة.");
      }

      setChallenge({
        id: String(body.challengeId),
        token: String(body.token),
        email: String(body.email ?? ""),
        expiresAt: String(body.expiresAt ?? ""),
      });
      setCode("");
      setResendIn(RESEND_SECONDS);
      setStep("otp");
      setNotice("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر تسجيل الدخول.");
    } finally {
      setSaving(false);
    }
  }

  const verify = useCallback(
    async (value: string) => {
      if (!challenge || verifying) return;
      if (value.length !== 6) {
        setError("أدخلي رمز التحقق المكوّن من 6 أرقام.");
        return;
      }
      setVerifying(true);
      setError("");
      try {
        const response = await fetch("/api/auth/login/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: challenge.id, token: challenge.token, code: value }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (body.code === "expired" || body.code === "locked") {
            setCode("");
          }
          throw new Error(body.error || "رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.");
        }
        try {
          window.sessionStorage.removeItem(WELCOME_SESSION_KEY);
        } catch {}
        router.push("/workspace");
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "تعذّر التحقق من الرمز.");
        setVerifying(false);
      }
    },
    [challenge, router, verifying],
  );

  function submitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verify(code);
  }

  async function resend() {
    if (!challenge || resending || resendIn > 0) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/login/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, token: challenge.token }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (body.code === "expired") {
          backToCredentials();
          setError("انتهت صلاحية الجلسة. سجّلي الدخول من جديد.");
          return;
        }
        throw new Error(body.error || "تعذّر إرسال رمز جديد.");
      }
      setCode("");
      setNotice("أرسلنا رمزًا جديدًا إلى بريد الإدارة بنجاح.");
      setResendIn(RESEND_SECONDS);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذّر إرسال رمز جديد.");
    } finally {
      setResending(false);
    }
  }

  function backToCredentials() {
    setStep("credentials");
    setChallenge(null);
    setCode("");
    setError("");
    setNotice("");
    setResendIn(0);
    setVerifying(false);
  }

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-x-hidden p-3.5 sm:p-6 lg:p-8"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      {/* Dynamic Animated Ambient Glow Orbs */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--brand-soft) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full opacity-55 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--lav-soft) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand) 30%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 80%)",
        }}
      />

      {/* Main Luxury Glassmorphic Card */}
      <section
        className="page-enter relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-2xl lg:min-h-[min(740px,calc(100dvh-4rem))] lg:grid-cols-[1.05fr_0.95fr]"
        style={{
          borderColor: "color-mix(in srgb, var(--line) 85%, transparent)",
          background: "color-mix(in srgb, var(--surface) 90%, transparent)",
          boxShadow: "0 30px 70px -15px rgba(112, 36, 89, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.4)",
        }}
      >
        {/* Left Interactive Column (Forms) */}
        <div className="relative flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12">
          {/* Mobile Top Header */}
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-sm"
                style={{ border: "1px solid var(--line)" }}
              >
                <Image
                  src="/luniva-logo-v2.png"
                  alt="شعار لونيفا"
                  width={96}
                  height={96}
                  priority
                  className="h-8 w-8 object-contain"
                />
              </span>
              <div>
                <p className="text-sm font-black text-[var(--ink)]">لونيفا LUNIVA</p>
                <p className="text-[10px] font-bold text-[var(--muted-2)]">بوابة إدارة النظام</p>
              </div>
            </div>
            <ThemeToggle showLabel={false} />
          </div>

          <div className="mx-auto w-full max-w-[25rem]">
            {/* Desktop Top Sub-header */}
            <div className="hidden items-center justify-between lg:flex">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10.5px] font-black tracking-wide shadow-sm"
                style={{
                  background: "var(--brand-soft)",
                  color: "var(--brand-strong)",
                  border: "1px solid color-mix(in srgb, var(--brand) 25%, transparent)",
                }}
              >
                <Sparkles size={13} />
                بوابة الإدارة المركزية
              </span>
              <ThemeToggle />
            </div>

            {/* Step Content with Animated Switch */}
            <AnimatePresence mode="wait">
              {step === "credentials" ? (
                <motion.div
                  key="step-credentials"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 lg:mt-8"
                >
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
                      أهلاً بعودتك ✨
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm font-bold leading-relaxed text-[var(--muted)]">
                      سجّلي الدخول للوصول إلى لوحة تحكم لونيفا، ومتابعة الفواتير والطلبات والعملاء.
                    </p>
                  </div>

                  <form onSubmit={login} className="mt-7 space-y-4">
                    {/* Username Field */}
                    <label className="block" htmlFor="login-username">
                      <span className="field-label mb-1.5 block text-xs font-black text-[var(--ink)]">
                        اسم المستخدم
                      </span>
                      <span
                        className="group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-all duration-200 focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[var(--brand-ring)] shadow-sm"
                        style={{
                          background: "var(--surface-2)",
                          border: "1.5px solid var(--line)",
                        }}
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-focus-within:scale-105"
                          style={{
                            background: "var(--surface)",
                            color: "var(--brand-strong)",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <UserRound size={17} />
                        </span>
                        <input
                          id="login-username"
                          required
                          name="username"
                          type="text"
                          autoComplete="username"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          autoFocus
                          disabled={saving}
                          placeholder="أدخل اسم المستخدم"
                          className="w-full min-w-0 bg-transparent py-1 text-left text-sm font-bold outline-none placeholder:text-[var(--muted-2)] disabled:opacity-60"
                          dir="ltr"
                          style={{ color: "var(--ink)" }}
                        />
                      </span>
                    </label>

                    {/* Password Field */}
                    <label className="block" htmlFor="login-password">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="field-label text-xs font-black text-[var(--ink)]">
                          كلمة المرور
                        </span>
                        <span className="text-[10px] font-bold text-[var(--muted-2)]">
                          حساسة لحالة الأحرف
                        </span>
                      </div>
                      <span
                        className="group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-all duration-200 focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[var(--brand-ring)] shadow-sm"
                        style={{
                          background: "var(--surface-2)",
                          border: "1.5px solid var(--line)",
                        }}
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-focus-within:scale-105"
                          style={{
                            background: "var(--surface)",
                            color: "var(--brand-strong)",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <LockKeyhole size={17} />
                        </span>
                        <input
                          id="login-password"
                          required
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          disabled={saving}
                          onKeyDown={syncCapsLock}
                          onKeyUp={syncCapsLock}
                          onBlur={() => setCapsLock(false)}
                          placeholder="••••••••"
                          className="w-full min-w-0 bg-transparent py-1 text-left text-sm outline-none placeholder:text-[var(--muted-2)] disabled:opacity-60 font-mono tracking-wider"
                          dir="ltr"
                          style={{ color: "var(--ink)" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-[var(--surface-3)] active:scale-95"
                          style={{ color: "var(--muted)" }}
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </span>
                      {capsLock && (
                        <span
                          aria-live="polite"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-bold"
                          style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                        >
                          <AlertTriangle size={13} />
                          مفتاح Caps Lock مفعّل — تحققي من حالة الأحرف
                        </span>
                      )}
                    </label>

                    {/* Remember me & 2FA info */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <label
                        className="flex cursor-pointer select-none items-center gap-2 text-xs font-bold"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        <input
                          name="remember"
                          type="checkbox"
                          disabled={saving}
                          className="h-4 w-4 cursor-pointer rounded accent-[var(--brand)]"
                        />
                        تذكرني لمدة 30 يومًا
                      </label>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={{ background: "var(--success-soft)", color: "var(--success)" }}
                      >
                        <ShieldCheck size={12} />
                        تحقق بخطوتين
                      </span>
                    </div>

                    {error && <ErrorBox message={error} />}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={saving}
                      className="group relative mt-2 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-3.5 px-5 text-sm font-black text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
                      style={{
                        background: "linear-gradient(135deg, var(--brand), var(--brand-strong))",
                        boxShadow: "0 16px 32px -4px rgba(112, 36, 89, 0.45)",
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0 -translate-x-full opacity-50 transition duration-700 group-hover:translate-x-full"
                        style={{
                          background: "linear-gradient(105deg, transparent, rgba(255,255,255,.4), transparent)",
                        }}
                      />
                      {saving ? (
                        <>
                          <LoaderCircle size={18} className="animate-spin" />
                          <span>جارِ إرسال الرمز...</span>
                        </>
                      ) : (
                        <>
                          <span>المتابعة إلى التحقق</span>
                          <ArrowLeft size={17} className="transition-transform duration-200 group-hover:-translate-x-1" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="mt-6 lg:mt-8"
                >
                  <div className="text-center">
                    <span
                      className="inline-grid h-12 w-12 place-items-center rounded-2xl shadow-sm mb-3"
                      style={{
                        background: "linear-gradient(135deg, var(--brand-soft), var(--lav-soft))",
                        color: "var(--brand-strong)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <KeyRound size={22} />
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
                      رمز التحقق (OTP)
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm font-bold text-[var(--muted)]">
                      أرسلنا رمز تحقق أمني مكوّن من 6 أرقام إلى بريدك الإلكتروني
                    </p>
                  </div>

                  <form onSubmit={submitOtp} className="mt-6 space-y-5">
                    {/* Destination Email Card */}
                    <div
                      className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                        style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                      >
                        <MailCheck size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10.5px] font-bold text-[var(--muted-2)]">البريد المستلم</p>
                        <p className="truncate text-xs sm:text-sm font-black font-mono" dir="ltr" style={{ color: "var(--ink)" }}>
                          {challenge?.email || "بريد الإدارة المسجل"}
                        </p>
                      </div>
                    </div>

                    {/* Upgraded Professional OTP Input */}
                    <div>
                      <OtpInput
                        value={code}
                        onChange={(next) => {
                          setCode(next);
                          if (error) setError("");
                        }}
                        onComplete={(next) => void verify(next)}
                        disabled={verifying}
                        invalid={Boolean(error)}
                        autoFocus
                        hint="الرمز صالح لمدة 10 دقائق · يُدخل تلقائيًا عند اكتمال الـ 6 أرقام"
                      />
                    </div>

                    {error && <ErrorBox message={error} />}

                    {notice && !error && (
                      <div
                        role="status"
                        className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold leading-6 shadow-sm"
                        style={{
                          background: "var(--success-soft)",
                          color: "var(--success)",
                          border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
                        }}
                      >
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        <span>{notice}</span>
                      </div>
                    )}

                    {/* Verify Button */}
                    <button
                      type="submit"
                      disabled={verifying || code.length !== 6}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3.5 px-5 text-sm font-black text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                      style={{
                        background: "linear-gradient(135deg, var(--brand), var(--brand-strong))",
                        boxShadow: "0 16px 32px -4px rgba(112, 36, 89, 0.45)",
                      }}
                    >
                      {verifying ? (
                        <>
                          <LoaderCircle size={18} className="animate-spin" />
                          <span>جارِ التحقق من الرمز...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>تأكيد والدخول للوحة التحكم</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Navigation Row */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={backToCredentials}
                        disabled={verifying}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition hover:bg-[var(--surface-3)] disabled:opacity-50"
                        style={{ color: "var(--muted)" }}
                      >
                        <ArrowRight size={14} />
                        تغيير البيانات
                      </button>
                      <button
                        type="button"
                        onClick={() => void resend()}
                        disabled={resending || verifying || resendIn > 0}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition hover:bg-[var(--brand-soft)] disabled:opacity-50"
                        style={{ color: "var(--brand-strong)" }}
                      >
                        <RefreshCw size={13} className={resending ? "animate-spin" : undefined} />
                        {resending
                          ? "جارِ الإرسال..."
                          : resendIn > 0
                            ? `إعادة الإرسال (${resendIn}ث)`
                            : "إعادة إرسال الرمز"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Trust Indicator */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold" style={{ color: "var(--muted-2)" }}>
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>جلسة مشفّرة ومحمية بتحقق ثنائي المدى</span>
            </div>
          </div>
        </div>

        {/* Right Luxury Brand Showcase Column (Desktop) */}
        <div
          className="relative order-last hidden overflow-hidden p-8 text-white lg:flex lg:flex-col xl:p-12"
          style={{
            background: "linear-gradient(160deg, #38192a 0%, #5d2b40 45%, #6b3f8a 100%)",
          }}
        >
          {/* Subtle Ambient Mesh Grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse at 70% 30%, black, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at 70% 30%, black, transparent 75%)",
            }}
          />
          <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full border-[32px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full border-[42px] border-[#e7a9ba]/20" />
          <div
            className="pointer-events-none absolute right-16 top-24 h-32 w-32 rounded-full opacity-40 blur-2xl"
            style={{ background: "#f3b8c9" }}
          />

          {/* Top Logo & Year Badge */}
          <div className="relative flex items-center justify-between">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-2xl">
              <Image
                src="/luniva-logo-v2.png"
                alt="شعار لونيفا"
                width={120}
                height={120}
                priority
                className="h-11 w-11 object-contain"
              />
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[10.5px] font-black text-rose-100 backdrop-blur">
              تأسست عام ٢٠٢٦
            </span>
          </div>

          {/* Center Brand Statements & Feature Cards */}
          <div className="relative my-auto py-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-rose-100 backdrop-blur">
              <Sparkles size={13} className="text-pink-300" />
              أناقة، تنظيم، وتحكّم كامل
            </span>
            <h2 className="mt-4 max-w-sm text-[2.2rem] font-light leading-[1.24] xl:text-[2.6rem]">
              كل ما تحتاجه إدارتك
              <span className="font-black text-[#ffd9e3] block mt-1"> في مكان واحد.</span>
            </h2>
            <p className="mt-3 max-w-sm text-xs sm:text-sm leading-relaxed text-rose-100/80">
              صُممت المنظومة لتمنحك تجربة إدارة سلسة وممتعة، من إدارة مخزون الأزياء وإصدار الفواتير وحتى تحصيل المدفوعات.
            </p>

            {/* Showcase Feature Cards */}
            <div className="mt-8 space-y-2.5">
              {highlights.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-3 backdrop-blur transition-all duration-300 hover:bg-white/[0.14] hover:-translate-x-1"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#ffd9e3] shadow-sm"
                    style={{ background: "rgba(255, 255, 255, 0.15)" }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-black leading-tight text-white">{title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-4 text-rose-100/75">{text}</p>
                  </div>
                  <CheckCircle2 size={16} className="ms-auto shrink-0 text-[#ffd9e3]" />
                </div>
              ))}
            </div>
          </div>

          {/* Showcase Footer */}
          <div className="relative flex items-center justify-between border-t border-white/15 pt-3 text-[10.5px] text-rose-100/70 font-bold">
            <span>© {new Date().getFullYear()} شركة لونيفا للأزياء النسائية</span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck size={13} />
              منظومة آمنة
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="login-shake flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold leading-6 shadow-sm"
      style={{
        background: "var(--danger-soft)",
        color: "var(--danger)",
        border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)",
      }}
    >
      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
