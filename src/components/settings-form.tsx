"use client";

import { Save, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import type { CompanySettings } from "@/lib/settings";

export default function SettingsForm({ initial }: { initial: CompanySettings }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<CompanySettings>(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    const toastId = toast.loading("جارِ حفظ الإعدادات");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الإعدادات.");
      toast.update(toastId, { tone: "success", title: "تم حفظ الإعدادات", description: "ستظهر البيانات على الفواتير والإيصالات." });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الإعدادات.";
      toast.update(toastId, { tone: "error", title: "لم يتم الحفظ", description: message });
    } finally {
      setBusy(false);
    }
  }

  const fields: Array<{ key: keyof CompanySettings; label: string; hint?: string; wide?: boolean; type?: string }> = [
    { key: "companyName", label: "اسم الشركة", hint: "يظهر في رأس الفاتورة والإيصال" },
    { key: "companyTagline", label: "الشعار النصي" },
    { key: "companyPhone", label: "رقم الهاتف" },
    { key: "taxNumber", label: "السجل الضريبي" },
    { key: "companyAddress", label: "العنوان", wide: true },
    { key: "receiptFooter", label: "رسالة الذيل", wide: true },
    { key: "paymentTermsDays", label: "مدة السماح للدفع (أيام)", type: "number", hint: "تُستخدم لحساب تاريخ الاستحقاق الافتراضي" },
  ];

  return (
    <section className="app-card p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Store size={20} /></span>
        <div>
          <h2 className="section-title">بيانات الشركة</h2>
          <p className="text-[11px] muted">تُستخدم هذه البيانات في رأس الفاتورة والإيصال وتقرير كشف الحساب.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, hint, wide, type }) => (
          <label key={key} className={wide ? "sm:col-span-2" : undefined}>
            <span className="field-label">{label}</span>
            <input
              type={type ?? "text"}
              min={type === "number" ? 0 : undefined}
              max={type === "number" ? 365 : undefined}
              value={form[key] as string | number}
              onChange={(event) => set(key, type === "number" ? Number(event.target.value) : event.target.value)}
              className="field"
            />
            {hint && <span className="field-hint">{hint}</span>}
          </label>
        ))}
      </div>

      <button type="button" onClick={save} disabled={busy} className="btn btn-primary mt-6 w-full sm:w-auto">
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={16} />}
        حفظ الإعدادات
      </button>
    </section>
  );
}
