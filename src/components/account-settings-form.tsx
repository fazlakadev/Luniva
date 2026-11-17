"use client";

import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/toast";

const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{2,79}$/;
const MIN_PASSWORD_LENGTH = 12;

type FormState = {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function AccountSettingsForm({ username }: { username: string }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>({
    username,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const nextUsername = form.username.trim();
    const nextPassword = form.newPassword;

    if (!USERNAME_PATTERN.test(nextUsername)) {
      toast.error("اسم المستخدم غير صالح", "استخدمي 3–80 حرفًا إنجليزيًا، ويبدأ بحرف.");
      return;
    }
    if (!form.currentPassword) {
      toast.error("مطلوب كلمة المرور الحالية", "أدخلي كلمة المرور الحالية قبل الحفظ.");
      return;
    }
    if (nextPassword && nextPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error("كلمة المرور قصيرة", `اختاري ${MIN_PASSWORD_LENGTH} حرفًا على الأقل.`);
      return;
    }
    if (nextPassword && nextPassword !== form.confirmPassword) {
      toast.error("التأكيد غير مطابق", "تأكدي من كتابة كلمة المرور الجديدة نفسها.");
      return;
    }

    setBusy(true);
    const toastId = toast.loading("جارِ تحديث بيانات الدخول");
    try {
      const response = await fetch("/api/auth/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: nextUsername,
          currentPassword: form.currentPassword,
          newPassword: nextPassword || undefined,
          confirmPassword: form.confirmPassword || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تحديث بيانات الحساب.");

      setForm((current) => ({
        ...current,
        username: nextUsername,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      toast.update(toastId, {
        tone: "success",
        title: "تم تحديث بيانات الدخول",
        description: data.passwordChanged
          ? "اسم المستخدم وكلمة المرور محدّثان. استخدميهما في الدخول القادم."
          : "اسم المستخدم محدّث. استخدميه في الدخول القادم.",
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحديث بيانات الحساب.";
      toast.update(toastId, { tone: "error", title: "لم يتم التحديث", description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
          <ShieldCheck size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">بيانات الدخول</h2>
          <p className="text-[11px] muted">اسم المستخدم الإنجليزي وكلمة المرور الخاصة بحساب الإدارة.</p>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">اسم المستخدم الحالي</span>
            <div className="field flex items-center justify-between gap-2" style={{ background: "var(--surface-2)" }}>
              <span className="mono truncate" dir="ltr">{username || "—"}</span>
              <UserRound size={15} className="shrink-0" style={{ color: "var(--muted-2)" }} />
            </div>
          </label>
          <label>
            <span className="field-label">اسم المستخدم الجديد</span>
            <input
              value={form.username}
              onChange={(event) => set("username", event.target.value)}
              required
              maxLength={80}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              dir="ltr"
              className="field text-left"
              placeholder="luniva"
            />
            <span className="field-hint">إنجليزي فقط، 3–80 حرفًا، ويبدأ بحرف.</span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">كلمة المرور الحالية</span>
            <input
              value={form.currentPassword}
              onChange={(event) => set("currentPassword", event.target.value)}
              type="password"
              required
              autoComplete="current-password"
              className="field"
              placeholder="••••••••"
            />
            <span className="field-hint">مطلوبة لتأكيد التغيير.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">كلمة المرور الجديدة</span>
              <input
                value={form.newPassword}
                onChange={(event) => set("newPassword", event.target.value)}
                type="password"
                autoComplete="new-password"
                className="field"
                placeholder="اتركيها فارغة للإبقاء"
              />
            </label>
            <label>
              <span className="field-label">تأكيد الجديدة</span>
              <input
                value={form.confirmPassword}
                onChange={(event) => set("confirmPassword", event.target.value)}
                type="password"
                autoComplete="new-password"
                className="field"
                placeholder="••••••••"
              />
            </label>
          </div>
        </div>

        <p className="flex items-start gap-2 text-[11px] leading-6 muted">
          <KeyRound size={14} className="mt-1 shrink-0" />
          اتركي حقول كلمة المرور الجديدة فارغة إذا كنتِ تريدين تغيير اسم المستخدم فقط. بعد الحفظ ستُحدَّث جلستك تلقائيًا.
        </p>

        <button type="submit" disabled={busy} className="btn btn-primary w-full sm:w-auto">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={16} />}
          حفظ بيانات الدخول
        </button>
      </form>
    </section>
  );
}
