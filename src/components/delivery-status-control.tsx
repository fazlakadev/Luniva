"use client";

import { CheckCircle2, LoaderCircle, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import {
  DELIVERY_STATUSES,
  deliveryStatusLabels,
  deliveryStatusSteps,
  normalizeDeliveryStatus,
  type DeliveryStatus,
} from "@/lib/invoice-shared";

export default function DeliveryStatusControl({
  id,
  invoiceNumber,
  initialStatus,
}: {
  id: string;
  invoiceNumber: string;
  initialStatus: DeliveryStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<DeliveryStatus>(initialStatus);
  const [selected, setSelected] = useState<DeliveryStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  const currentIndex = deliveryStatusSteps.indexOf(status as Exclude<DeliveryStatus, "cancelled">);
  const dirty = selected !== status;

  async function save() {
    if (saving || !dirty) return;
    setSaving(true);
    const toastId = toast.loading("جارِ تحديث حالة التوصيل");
    try {
      const response = await fetch(`/api/invoices/${id}/delivery-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus: selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة التوصيل.");

      const next = normalizeDeliveryStatus(data.deliveryStatus) ?? selected;
      setStatus(next);
      setSelected(next);
      toast.update(toastId, {
        tone: "success",
        title: "تم تحديث حالة التوصيل",
        description: `حالة ${invoiceNumber} الآن: ${data.statusLabel ?? deliveryStatusLabels[next]}`,
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحديث حالة التوصيل.";
      toast.update(toastId, { tone: "error", title: "لم يتم التحديث", description: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-card p-5 print-hidden">
      <div className="flex items-center gap-2">
        <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <Truck size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">تتبّع التوصيل</h2>
          <p className="text-[10px] muted-2">حدّدي المرحلة الحالية لتظهر للعميلة فورًا.</p>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5"
        style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        <span className="text-[10px] font-bold muted">الحالة الحالية</span>
        <span className="badge badge-brand"><CheckCircle2 size={11} />{deliveryStatusLabels[status]}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {deliveryStatusSteps.map((step, index) => {
          const reached = currentIndex >= index && status !== "cancelled";
          return (
            <span
              key={step}
              className="rounded-full px-2.5 py-1 text-[9px] font-black"
              style={{
                background: reached ? "var(--success-soft)" : "var(--surface-2)",
                color: reached ? "var(--success)" : "var(--muted-2)",
                border: `1px solid ${reached ? "color-mix(in srgb, var(--success) 24%, transparent)" : "var(--line)"}`,
              }}
            >
              {reached ? "✓ " : ""}{deliveryStatusLabels[step]}
            </span>
          );
        })}
      </div>

      {status === "cancelled" && (
        <p className="mt-3 rounded-xl px-3 py-2 text-[10px] font-bold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          التوصيل ملغي للفاتورة {invoiceNumber}.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="min-w-0">
          <span className="field-label">تغيير الحالة</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value as DeliveryStatus)}
            className="field w-full px-3 py-2.5 text-[11px]"
          >
            {DELIVERY_STATUSES.map((option) => (
              <option key={option} value={option}>{deliveryStatusLabels[option]}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="btn btn-primary px-4 py-2.5 text-[11px] disabled:opacity-50"
        >
          {saving ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {saving ? "جارٍ الحفظ" : "حفظ الحالة"}
        </button>
      </div>

      <p className="mt-3 text-[10px] leading-5 muted-2">
        تغيير الحالة لا يعدّل المبالغ أو المدفوعات، ويظهر مباشرة في صفحة معاينة الفاتورة الخاصة بالعميلة.
      </p>
    </section>
  );
}
