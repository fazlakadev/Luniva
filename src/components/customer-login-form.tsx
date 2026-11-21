"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartHandshake,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import OtpInput from "@/components/ui/otp-input";
import { useToast } from "@/components/toast";

const RESEND_COOLDOWN = 25;

export default function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const returnTo = searchParams.get("returnTo") || "/catalog";
  const errorParam = searchParams.get("error");

  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state (Step 1)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

  // Register OTP state (Step 2)
  const [registerStage, setRegisterStage] = useState<"form" | "otp">("form");
  const [challengeId, setChallengeId] = useState("");
  const [token, setToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (errorParam === "google_cancelled") {
      toast.error("تم إلغاء التسجيل", "تم إلغاء تسجيل الدخول بحساب Google.");
    } else if (errorParam) {
      toast.error("خطأ في تسجيل الدخول", decodeURIComponent(errorParam));
    }
  }, [errorParam, toast]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("بيانات ناقصة", "يرجى إدخال رقم الهاتف أو البريد الإلكتروني.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر تسجيل الدخول");

      toast.success("أهلاً بكِ في لونيفا!", `تم تسجيل الدخول بنجاح، مرحباً ${data.customer.fullName}`);
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر تسجيل الدخول";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("اسم العميلة مطلوب", "يرجى كتابة اسمكِ بالكامل.");
      return;
    }
    if (!phone.trim()) {
      toast.error("رقم الهاتف مطلوب", "يرجى كتابة رقم الهاتف والواتساب لتأكيد الحجوزات.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error("البريد الإلكتروني مطلوب", "يرجى إدخال بريد إلكتروني صالح لاستلام رمز التحقق وتفعيل الحساب.");
      return;
    }
    if (password && password.length < 6) {
      toast.error("كلمة المرور قصيرة", "اختاري كلمة مرور من 6 خانات على الأقل.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password || undefined,
          address: address.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر بدء إنشاء الحساب.");

      setChallengeId(data.challengeId);
      setToken(data.token);
      setMaskedEmail(data.email || email);
      setRegisterStage("otp");
      setOtpCode("");
      setResendIn(RESEND_COOLDOWN);
      toast.success("تم إرسال الرمز!", `أرسلنا رمز تفعيل من 6 أرقام إلى بريدكِ الإلكتروني.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر إرسال رمز التحقق.";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(codeToVerify?: string) {
    const finalCode = (codeToVerify || otpCode).replace(/\D/g, "");
    if (finalCode.length !== 6) {
      toast.error("رمز ناقص", "يرجى إدخال الرمز المكون من 6 أرقام.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, token, code: finalCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر تأكيد الرمز.");

      toast.success("تم تفعيل حسابكِ بنجاح!", `أهلاً بكِ في عائلة لونيفا ✨`);
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "الرمز غير صحيح أو انتهت صلاحيته.";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resending || resendIn > 0) return;
    setResending(true);
    try {
      const res = await fetch("/api/customer/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر إعادة إرسال الرمز.");

      setOtpCode("");
      setResendIn(RESEND_COOLDOWN);
      toast.success("تم الإرسال مجدداً", "أرسلنا رمز تحقق جديد إلى بريدكِ.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر إعادة إرسال الرمز.";
      toast.error("خطأ", msg);
    } finally {
      setResending(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="app-card relative overflow-hidden p-6 sm:p-8 shadow-2xl border-2 border-[var(--line)]">
        {/* Subtle Decorative Glow */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-30 blur-2xl"
          style={{ background: "var(--brand)" }}
        />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-3"
            style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
          >
            <Sparkles size={13} />
            أزياء وتصاميم لونيفا
          </span>
          <h1 className="text-2xl font-black text-[var(--ink)] sm:text-3xl">
            {tab === "login" ? "تسجيل الدخول" : registerStage === "otp" ? "تأكيد بريدكِ الإلكتروني" : "إنشاء حساب عميلة جديد"}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
            {tab === "login"
              ? "سجلي دخولكِ لمتابعة طلبات واستفسارات الحجز والتنسيق الخاص مع الأتيليه"
              : registerStage === "otp"
              ? `أدخلي رمز التحقق السري المكوّن من 6 أرقام المرسل إلى ${maskedEmail}`
              : "انضمي لعالم لونيفا لتصفح الكولكشن وحفظ فساتينكِ المفضلة وطلب التنسيق"}
          </p>
        </div>

        {/* Tab Switcher (Only when not in OTP stage) */}
        {registerStage === "form" && (
          <div className="flex rounded-2xl bg-[var(--surface-2)] p-1.5 mb-6 border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                tab === "login"
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                tab === "register"
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {/* Google OAuth Quick Button (Show in login and register form stage) */}
        {registerStage === "form" && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] text-xs font-black text-[var(--ink)] shadow-sm hover:border-[var(--brand)] hover:bg-[var(--surface-2)] transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>المتابعة السريعة باستخدام حساب Google</span>
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--line)]" />
              </div>
              <span className="relative bg-[var(--surface)] px-3 text-[11px] font-bold text-[var(--muted-2)]">
                أو باستخدام بيانات الحساب
              </span>
            </div>
          </>
        )}

        {/* Tab 1: Login Form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <span className="field-label">رقم الهاتف أو البريد الإلكتروني</span>
              <div className="relative">
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="01004140026 أو name@example.com"
                  className="field text-right"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="field-label mb-0">كلمة المرور</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="أدخلي كلمة المرور"
                  className="field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)] hover:text-[var(--ink)]"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-xs font-black shadow-md mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>جارِ تسجيل الدخول...</span>
                </>
              ) : (
                <span>تسجيل الدخول ومتابعة</span>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Register Form - Step 1: Input details */}
        {tab === "register" && registerStage === "form" && (
          <form onSubmit={handleStartRegister} className="space-y-3.5">
            <div>
              <span className="field-label">اسم العميلة بالكامل *</span>
              <div className="relative">
                <User size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: ندى أحمد الشافعي"
                  className="field pr-10 text-xs"
                />
              </div>
            </div>

            <div>
              <span className="field-label">رقم الهاتف والواتساب *</span>
              <div className="relative">
                <Phone size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01004140026"
                  className="field pr-10 text-right text-xs"
                />
              </div>
              <span className="field-hint">للتواصل وتأكيد قياسات الفساتين وموعد الاستلام</span>
            </div>

            <div>
              <span className="field-label">البريد الإلكتروني (لتفعيل الحساب واستلام OTP) *</span>
              <div className="relative">
                <Mail size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="field pr-10 text-right text-xs"
                />
              </div>
              <span className="field-hint">سنرسل لكِ رمز التحقق لتأكيد وتفعيل الحساب فوراً</span>
            </div>

            <div>
              <span className="field-label">كلمة المرور (اختياري / لحماية الحساب)</span>
              <div className="relative">
                <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 خانات على الأقل"
                  className="field pr-10 text-xs"
                />
              </div>
            </div>

            <div>
              <span className="field-label">العنوان للتوصيل (اختياري)</span>
              <div className="relative">
                <MapPin size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المدينة والحي والشارع"
                  className="field pr-10 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-xs font-black shadow-md mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>جارِ إرسال رمز التحقق OTP...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>إرسال رمز التحقق وتفعيل الحساب</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Register Form - Step 2: OTP Verification */}
        {tab === "register" && registerStage === "otp" && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand-soft)] p-4 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand)] text-white shadow-sm">
                <Mail size={22} />
              </span>
              <p className="mt-2.5 text-xs font-black text-[var(--brand-strong)]">
                أرسلنا رمز التحقق المكوّن من 6 أرقام
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)] font-mono" dir="ltr">
                {maskedEmail}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <OtpInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={(val) => handleVerifyOtp(val)}
                autoFocus
                label="رمز التحقق OTP"
              />
            </div>

            {/* Resend Timer & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setRegisterStage("form")}
                className="flex items-center gap-1 font-bold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <ArrowRight size={13} />
                تعديل البيانات أو البريد
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || resendIn > 0}
                className="flex items-center gap-1 font-black text-[var(--brand-strong)] disabled:opacity-40"
              >
                <RotateCcw size={13} className={resending ? "animate-spin" : ""} />
                {resendIn > 0 ? `إعادة الإرسال بعد (${resendIn}ث)` : "إعادة إرسال الرمز"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpCode.replace(/\D/g, "").length !== 6}
              className="btn btn-primary w-full justify-center py-3 text-xs font-black shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>جارِ التحقق وتفعيل الحساب...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>تأكيد وتفعيل الحساب ومتابعة</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Security & Reassurance Footer */}
        <div className="mt-6 border-t border-[var(--line)] pt-4 text-[11px] text-[var(--muted)] space-y-1.5 leading-relaxed">
          <p className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span>طلب واستفسار فوري بدون دفع إلكتروني — سيتواصل معكِ الأتيليه.</span>
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span>بياناتكِ مشفرة ومحمية بأعلى معايير الخصوصية والأمان.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
