"use client";

import { AlertCircle, Check, ChevronRight, LoaderCircle, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/toast";
import { readJson } from "@/lib/client-response";

export type SupplierDetail = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

export default function SupplierForm({ supplier }: { supplier?: SupplierDetail }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(supplier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const body = {
        name: String(form.get("name") ?? "").trim(),
        contactName: String(form.get("contactName") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        address: String(form.get("address") ?? "").trim(),
        notes: String(form.get("notes") ?? "").trim(),
      };
      const response = await fetch(editing ? `/api/suppliers/${supplier?.id}` : "/api/suppliers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJson<{ error?: string; supplier?: { id: string } }>(response);
      if (!response.ok) throw new Error(data.error || "تعذر حفظ المورد.");
      toast.success(editing ? "تم حفظ المورد" : "تمت إضافة المورد", "جارِ فتح ملف المورد...");
      router.push(`/suppliers/${data.supplier?.id ?? ""}`);
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "تعذر حفظ المورد.";
      setError(message);
      setSaving(false);
      toast.error("تعذر حفظ المورد", message);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">شبكة التوريد</p>
          <h1 className="page-title mt-1">{editing ? "تعديل المورد" : "مورد جديد"}</h1>
          <p className="page-subtitle mt-2 max-w-xl text-[12px] leading-7 sm:text-sm">
            أضيفي بيانات المورد لربطه بأسعار التوريد لكل متغير، وتتبّعي أرباحه من الفواتير.
          </p>
        </div>
        <Link href="/suppliers" className="btn btn-outline self-start">العودة للموردين</Link>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl p-4 text-sm font-bold" style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)" }}>
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="app-card max-w-3xl p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Store size={20} /></span>
          <div>
            <h2 className="section-title">بيانات المورد</h2>
            <p className="mt-0.5 text-xs muted">الاسم مطلوب، وبقية البيانات اختيارية.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="field-label">اسم المورد</span>
            <input required name="name" maxLength={160} defaultValue={supplier?.name ?? ""} placeholder="مثال: شركة النور للتوريد" className="field" />
          </label>
          <label>
            <span className="field-label">اسم المسؤول</span>
            <input name="contactName" maxLength={120} defaultValue={supplier?.contact_name ?? ""} placeholder="اختياري" className="field" />
          </label>
          <label>
            <span className="field-label">رقم الهاتف</span>
            <input name="phone" maxLength={32} dir="ltr" defaultValue={supplier?.phone ?? ""} placeholder="01xxxxxxxxx" className="field mono text-left" />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">البريد الإلكتروني</span>
            <input type="email" name="email" maxLength={160} dir="ltr" defaultValue={supplier?.email ?? ""} placeholder="supplier@example.com" className="field text-left" />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">العنوان</span>
            <input name="address" maxLength={500} defaultValue={supplier?.address ?? ""} placeholder="اختياري" className="field" />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">ملاحظات</span>
            <textarea name="notes" maxLength={1000} defaultValue={supplier?.notes ?? ""} placeholder="شروط التوريد، ملاحظات الجودة..." className="field min-h-24 resize-y" />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Link href="/suppliers" className="btn btn-outline">إلغاء</Link>
          <button disabled={saving} className="btn btn-primary">
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "جارِ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المورد"}
          </button>
        </div>
      </form>
    </>
  );
}
