"use client";

import { Building2, Calendar, FileText, MapPin, Phone, Receipt, Save, ShieldCheck, Sparkles, Store } from "lucide-react";
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
      toast.update(toastId, { tone: "success", title: "تم حفظ الإعدادات بنجاح", description: "ستظهر البيانات المحدثة على الفواتير والإيصالات والمتجر فوراً." });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الإعدادات.";
      toast.update(toastId, { tone: "error", title: "لم يتم الحفظ", description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-5">
        <div className="flex items-center gap-3">
          <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            <Store size={22} />
          </span>
          <div>
            <h2 className="section-title text-base sm:text-lg">هوية الأتيليه وبيانات الفواتير</h2>
            <p className="text-xs text-[var(--muted)]">تُعتمد هذه البيانات تلقائياً في ترويسات الفواتير، إيصالات القبض، وكشوفات حساب العملاء.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn btn-primary px-4 py-2 text-xs font-black shadow-sm"
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={15} />}
          حفظ التغييرات
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Section 1: Basic Brand Identity */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-[var(--brand-strong)]">
            <Building2 size={15} />
            البيانات الأساسية للمنشأة
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">اسم الأتيليه / الشركة</span>
              <input
                type="text"
                value={form.companyName || ""}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="مثال: أزياء لونيفا LUNIVA"
                className="field"
              />
              <span className="field-hint">يظهر في أعلى كل فاتورة وإيصال رسمي</span>
            </label>

            <label>
              <span className="field-label">الشعار النصي (Slogan)</span>
              <input
                type="text"
                value={form.companyTagline || ""}
                onChange={(e) => set("companyTagline", e.target.value)}
                placeholder="مثال: فساتين وتصاميم نسائية راقية"
                className="field"
              />
              <span className="field-hint">وصف موجز للمنشأة يظهر تحت الاسم</span>
            </label>

            <label>
              <span className="field-label">رقم هاتف التواصل الرسمي</span>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  value={form.companyPhone || ""}
                  onChange={(e) => set("companyPhone", e.target.value)}
                  placeholder="01004140026"
                  className="field text-right"
                />
              </div>
              <span className="field-hint">رقم الواتساب والاتصال الخاص بخدمة العملاء</span>
            </label>

            <label>
              <span className="field-label">السجل الضريبي / التجاري</span>
              <input
                type="text"
                dir="ltr"
                value={form.taxNumber || ""}
                onChange={(e) => set("taxNumber", e.target.value)}
                placeholder="مثال: 123-456-789"
                className="field text-right"
              />
              <span className="field-hint">لأغراض الامتثال الضريبي والفواتير الرسمية</span>
            </label>
          </div>
        </div>

        {/* Section 2: Address & Policy */}
        <div className="border-t border-[var(--line)] pt-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-black text-[var(--brand-strong)]">
            <MapPin size={15} />
            المقر وسياسات الدفع
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="field-label">عنوان الأتيليه والمقر</span>
              <input
                type="text"
                value={form.companyAddress || ""}
                onChange={(e) => set("companyAddress", e.target.value)}
                placeholder="مثال: المنصورة، شارع الجمهورية، برج التحرير"
                className="field"
              />
              <span className="field-hint">العنوان الكامل المطبوع على المستندات لاستلام واسترجاع الطلبات</span>
            </label>

            <label>
              <span className="field-label">فترة السماح للدفع (بالأيام)</span>
              <input
                type="number"
                min={0}
                max={365}
                value={form.paymentTermsDays || 0}
                onChange={(e) => set("paymentTermsDays", Number(e.target.value))}
                className="field"
              />
              <span className="field-hint">يُحسب تاريخ الاستحقاق الافتراضي تلقائياً بعد هذا العدد من الأيام</span>
            </label>

            <label className="sm:col-span-2">
              <span className="field-label">رسالة ذيل الفاتورة والإيصال</span>
              <textarea
                rows={2}
                value={form.receiptFooter || ""}
                onChange={(e) => set("receiptFooter", e.target.value)}
                placeholder="مثال: شكراً لاختياركِ لونيفا. لا يُرد الفستان بعد مضي 14 يوماً من الاستلام."
                className="field resize-none"
              />
              <span className="field-hint">تظهر في أسفل الفاتورة وتوضح شروط الاسترجاع والاستبدال</span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn btn-primary px-6 py-2.5 text-xs font-black shadow-md w-full sm:w-auto"
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={16} />}
          حفظ إعدادات الهوية
        </button>
      </div>
    </section>
  );
}
