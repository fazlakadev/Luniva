"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

const highlights = [
  { icon: UsersRound, title: "دليل العملاء", text: "ملفات وأرقام وتفاصيل مرتبة في مكان واحد." },
  { icon: Layers3, title: "المنتجات والمتغيرات", text: "ألوان ومقاسات وأسعار محسوبة بدقة." },
  { icon: Gift, title: "البكدجات", text: "توليد تلقائي للتوليفات مع تسعير ذكي." },
];

export default function LoginPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function syncCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          remember: form.get("remember") === "on",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر تسجيل الدخول.");
      router.push("/workspace");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تسجيل الدخول.");
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-3 sm:p-6 lg:p-8"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 8%, var(--brand-soft) 0, transparent 38%), radial-gradient(circle at 90% 92%, var(--lav-soft) 0, transparent 36%), radial-gradient(circle at 70% 10%, color-mix(in srgb, var(--brand-soft) 55%, transparent) 0, transparent 28%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand) 26%, transparent) 1px, transparent 0)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full opacity-50 blur-3xl sm:h-80 sm:w-80"
        style={{ background: "var(--brand-soft)", animation: "float-soft 10s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--lav-soft)", animation: "float-soft 13s ease-in-out infinite reverse" }}
      />

      <section
        className="page-enter relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border shadow-2xl backdrop-blur-xl sm:rounded-[2rem] lg:min-h-[min(780px,calc(100dvh-4rem))] lg:grid-cols-[1fr_0.92fr]"
        style={{
          borderColor: "var(--line)",
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Login */}
        <div className="relative flex flex-col justify-center px-5 py-9 sm:px-10 sm:py-12 lg:px-14">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Image src="/luniva-logo-v2.png" alt="Luniva" width={128} height={128} priority className="h-11 w-11 rounded-xl object-contain" />
            <div className="flex items-center gap-2">
              <span className="badge badge-brand">LUNIVA EMS</span>
              <ThemeToggle showLabel={false} />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[25rem]">
            <div className="hidden items-center justify-between lg:flex">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black tracking-[0.16em]"
                style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
              >
                <Sparkles size={12} />LUNIVA EMS
              </span>
              <ThemeToggle />
            </div>

            <div className="mt-7 lg:mt-8">
              <p className="eyebrow">بوابة الدخول</p>
              <h1 className="page-title mt-1.5 text-[2rem] sm:text-[2.35rem]">أهلًا بعودتك</h1>
              <p className="page-subtitle mt-2 max-w-sm">
                سجّلي الدخول لمتابعة عملائك، منتجاتك، وبكدجاتك من مساحة واحدة منظمة وأنيقة.
              </p>
            </div>

            <form onSubmit={login} className="mt-8 space-y-4" noValidate={false}>
              <label className="block" htmlFor="login-email">
                <span className="field-label">البريد الإلكتروني</span>
                <span
                  className="group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[var(--brand-ring)]"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-focus-within:scale-105"
                    style={{ background: "var(--surface)", color: "var(--brand-strong)", border: "1px solid var(--line)" }}
                  >
                    <Mail size={17} />
                  </span>
                  <input
                    id="login-email"
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    disabled={saving}
                    placeholder="name@luniva.com"
                    className="w-full min-w-0 bg-transparent py-1.5 text-left text-sm outline-none placeholder:text-[var(--muted-2)] disabled:opacity-60"
                    dir="ltr"
                    style={{ color: "var(--ink)" }}
                  />
                </span>
              </label>

              <label className="block" htmlFor="login-password">
                <span className="flex items-center justify-between">
                  <span className="field-label">كلمة المرور</span>
                  <span className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>حساسة لحالة الأحرف</span>
                </span>
                <span
                  className="group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[var(--brand-ring)]"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-focus-within:scale-105"
                    style={{ background: "var(--surface)", color: "var(--brand-strong)", border: "1px solid var(--line)" }}
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
                    className="w-full min-w-0 bg-transparent py-1.5 text-left text-sm outline-none placeholder:text-[var(--muted-2)] disabled:opacity-60"
                    dir="ltr"
                    style={{ color: "var(--ink)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-[var(--surface-3)]"
                    style={{ color: "var(--muted)" }}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
                {capsLock && (
                  <span
                    aria-live="polite"
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold"
                    style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
                  >
                    <AlertTriangle size={12} />
                    مفتاح Caps Lock مفعّل — تحققي من حالة الأحرف
                  </span>
                )}
              </label>

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs font-bold" style={{ color: "var(--ink-soft)" }}>
                  <input
                    name="remember"
                    type="checkbox"
                    disabled={saving}
                    className="h-4 w-4 cursor-pointer rounded accent-[var(--brand)]"
                  />
                  تذكرني لمدة 30 يومًا
                </label>
                <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--success)" }}>
                  <ShieldCheck size={13} />جلسة آمنة
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="login-shake flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold leading-6"
                  style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 45%, transparent)" }}
                >
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]" style={{ background: "var(--surface)" }}>!</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, var(--brand), var(--brand-strong))",
                  boxShadow: "0 16px 34px var(--brand-ring)",
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full opacity-60 transition duration-700 group-hover:translate-x-full"
                  style={{ background: "linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent)" }}
                />
                {saving ? <LoaderCircle size={18} className="animate-spin" /> : null}
                <span className="relative">{saving ? "جارِ الدخول..." : "دخول إلى النظام"}</span>
                {!saving && <ArrowLeft size={18} className="relative transition group-hover:-translate-x-1" />}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-[11px]" style={{ color: "var(--muted-2)" }}>
              <ShieldCheck size={14} />
              محمي بجلسة آمنة وتشفير كامل للبيانات
            </div>

            <p className="mt-6 text-center text-[10px] lg:hidden" style={{ color: "var(--muted-2)" }}>
              © {new Date().getFullYear()} Luniva Studio · جميع الحقوق محفوظة
            </p>
          </div>
        </div>

        {/* Brand showcase */}
        <div
          className="relative order-last hidden overflow-hidden p-8 text-white lg:flex lg:flex-col xl:p-10"
          style={{ background: "linear-gradient(155deg, #3f2432 0%, #6e3a4d 42%, #7a5aa8 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
              backgroundSize: "22px 22px",
              maskImage: "radial-gradient(ellipse at 70% 30%, black, transparent 72%)",
              WebkitMaskImage: "radial-gradient(ellipse at 70% 30%, black, transparent 72%)",
            }}
          />
          <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full border-[32px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full border-[42px] border-[#e7a9ba]/20" />
          <div
            className="pointer-events-none absolute right-16 top-24 h-28 w-28 rounded-full opacity-40 blur-2xl"
            style={{ background: "#f3b8c9", animation: "float-soft 9s ease-in-out infinite" }}
          />
          <span
            className="pointer-events-none absolute -bottom-6 left-2 select-none text-[8rem] font-black leading-none tracking-tighter text-white/[0.04]"
            aria-hidden="true"
          >
            LUNIVA
          </span>

          <div className="relative flex items-center justify-between">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-xl">
              <Image src="/luniva-logo-v2.png" alt="Luniva" width={120} height={120} priority className="h-12 w-12 object-contain" />
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-black tracking-[0.2em] text-rose-100 backdrop-blur">
              ENTERPRISE SUITE
            </span>
          </div>

          <div className="relative my-auto py-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-rose-100 backdrop-blur">
              <Sparkles size={13} />منظمة، أنيقة، قريبة منك
            </span>
            <h2 className="mt-4 max-w-sm text-[2.15rem] font-light leading-[1.25] xl:text-[2.5rem]">
              مساحة واحدة تجمع
              <span className="font-extrabold text-[#ffd9e3]"> كل تفاصيل عملك.</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-rose-100/85">
              من ملفات العميلات إلى المنتجات والبكدجات — تجربة إدارة هادئة، منظمة، ومصممة بهوية Luniva.
            </p>

            <div className="mt-7 space-y-2">
              {highlights.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-2.5 backdrop-blur transition hover:bg-white/[0.11]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#ffd9e3]" style={{ background: "rgba(255,255,255,.12)" }}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold leading-5">{title}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-rose-100/70">{text}</p>
                  </div>
                  <CheckCircle2 size={15} className="ms-auto shrink-0 text-[#ffd9e3]/70" />
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[10px] text-rose-100/60">
            <span>© {new Date().getFullYear()} Luniva Studio</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={12} />بيانات محمية</span>
          </div>
        </div>
      </section>
    </main>
  );
}
