"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Phone,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
  MapPin,
  HeartHandshake,
} from "lucide-react";
import { useToast } from "@/components/toast";

export default function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const returnTo = searchParams.get("returnTo") || "/catalog";
  const errorParam = searchParams.get("error");

  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error("بيانات ناقصة", "يرجى كتابة الاسم ورقم الهاتف.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
          address: address.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر إنشاء الحساب");

      toast.success("تم إنشاء الحساب بنجاح!", `أهلاً بكِ معنا في عائلة لونيفا ✨`);
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر إنشاء الحساب";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="app-card p-6 sm:p-8 shadow-2xl border-2 border-[var(--line)]">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            <Sparkles size={14} />
            حساب عميلة لونيفا فاشون
          </span>
          <h1 className="text-2xl font-black text-ink">
            {tab === "login" ? "تسجيل الدخول" : "إنشاء حساب عميلة جديد"}
          </h1>
          <p className="text-xs muted mt-1.5 leading-5">
            لحفظ قطعكِ المفضلة ومتابعة طلبات واستفسارات الحجز والتنسيق الخاص
          </p>
        </div>

        {errorParam && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs font-bold text-rose-700 dark:text-rose-300 text-center">
            {errorParam}
          </div>
        )}

        {/* 1-Click Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-all font-bold text-xs text-ink shadow-sm mb-5 group active:scale-95"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>المتابعة بنقرة واحدة باستخدام Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-[var(--line)] w-full" />
          <span className="bg-[var(--surface)] px-3 text-[11px] font-bold muted shrink-0">
            أو عبر بيانات الهاتف
          </span>
          <div className="border-t border-[var(--line)] w-full" />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-2)] mb-5 border border-[var(--line)]">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`py-2 text-xs font-black rounded-lg transition ${
              tab === "login"
                ? "bg-[var(--surface)] text-[var(--brand-strong)] shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`py-2 text-xs font-black rounded-lg transition ${
              tab === "register"
                ? "bg-[var(--surface)] text-[var(--brand-strong)] shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            إنشاء حساب سريع
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                رقم الهاتف أو البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="01012345678 أو email@example.com"
                  dir="ltr"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                كلمة المرور (إذا تم تحديدها)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                dir="ltr"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
              />
              <p className="text-[10px] muted mt-1">
                إذا سجلتِ سابقاً برقم الهاتف فقط، اتركي كلمة المرور فارغة للدخول السريع.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-xs font-black shadow-md shadow-[var(--brand)]/20 mt-2"
            >
              {loading ? "جارِ تسجيل الدخول…" : "دخول إلى حسابي"}
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">اسم العميلة بالكامل</label>
              <input
                type="text"
                required
                placeholder="مثال: ياسمين أحمد"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[var(--brand)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">رقم هاتف الواتساب</label>
              <input
                type="tel"
                required
                placeholder="01xxxxxxxxx"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">البريد الإلكتروني (اختياري)</label>
              <input
                type="email"
                placeholder="name@example.com"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">العنوان أو المدينة (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: القاهرة، التجمع الخامس"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[var(--brand)] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">كلمة المرور (اختياري لحماية الحساب)</label>
              <input
                type="password"
                placeholder="اختياري - 6 أحرف على الأقل"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-xs font-black shadow-md shadow-[var(--brand)]/20 mt-2"
            >
              {loading ? "جارِ حفظ الحساب…" : "تأكيد وإنشاء الحساب"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[var(--line)] text-center text-[11px] muted">
          <span>بحاجة للمساعدة؟ </span>
          <Link href="/contact" className="font-bold underline text-[var(--brand-strong)]">
            تواصلي معنا عبر صفحة الدعم
          </Link>
        </div>
      </div>
    </div>
  );
}
