"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Pencil,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import DateField from "@/components/date-field";
import { useToast } from "@/components/toast";
import { formatDate, formatMoney } from "@/lib/format";
import {
  PAYMENT_METHODS,
  paymentMethodLabels,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentRow,
} from "@/lib/invoice-shared";
import { DISCOUNT_TYPES, discountTypeLabels, type DiscountType } from "@/lib/packages";

function todayInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function dateInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return todayInput();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function InvoiceActions({
  id,
  invoiceNumber,
  total,
  paidAmount,
  status,
  dueDate,
  deliveryFee,
  deliveryArea,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  payments,
}: {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string | null;
  deliveryFee: number;
  deliveryArea: string;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(paymentMethod);
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(todayInput);
  const [paymentNote, setPaymentNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fee, setFee] = useState(String(deliveryFee));
  const [area, setArea] = useState(deliveryArea);
  const [type, setType] = useState<DiscountType>(discountType);
  const [value, setValue] = useState(String(discountValue));
  const [note, setNote] = useState(notes);
  const [due, setDue] = useState(dueDate ?? "");

  const [busy, setBusy] = useState(false);
  const cancelled = status === "cancelled";
  const remaining = Math.max(0, Math.round((total - paidAmount + Number.EPSILON) * 100) / 100);

  function resetPaymentForm() {
    setAmount("");
    setReference("");
    setPaymentNote("");
    setPaidAt(todayInput());
    setEditingId(null);
  }

  async function sendPayment(path: string, methodName: string, body: Record<string, unknown>, successTitle: string) {
    if (busy) return;
    setBusy(true);
    const toastId = toast.loading("جارِ الحفظ", "بنحدّث سجل التحصيل…");
    try {
      const response = await fetch(path, {
        method: methodName,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الدفعة.");
      toast.update(toastId, { tone: "success", title: successTitle, description: `رقم الإيصال ${data.payment?.receipt_number ?? ""}`.trim() });
      resetPaymentForm();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الدفعة.";
      toast.update(toastId, { tone: "error", title: "لم يتم الحفظ", description: message });
    } finally {
      setBusy(false);
    }
  }

  function submitPayment() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("مبلغ الدفع غير صالح", "أدخلي مبلغًا أكبر من صفر.");
      return;
    }
    if (!editingId && value > remaining + 0.001) {
      toast.error("المبلغ أكبر من المتبقي", `المتبقي الحالي ${formatMoney(remaining)}.`);
      return;
    }
    const body = { amount: value, method, reference, paidAt, notes: paymentNote };
    if (editingId) {
      void sendPayment(`/api/invoices/${id}/payments/${editingId}`, "PATCH", body, "تم تعديل الدفعة");
    } else {
      void sendPayment(`/api/invoices/${id}/payments`, "POST", body, "تم تسجيل الدفعة");
    }
  }

  function startEdit(payment: PaymentRow) {
    setEditingId(payment.id);
    setAmount(String(payment.amount));
    setMethod(payment.payment_method);
    setReference(payment.reference ?? "");
    setPaidAt(dateInput(payment.paid_at));
    setPaymentNote(payment.notes ?? "");
  }

  async function removePayment(payment: PaymentRow) {
    if (busy) return;
    if (!window.confirm(`حذف الدفعة ${payment.receipt_number}؟ سيُحدَّث رصيد الفاتورة تلقائيًا.`)) return;
    setBusy(true);
    const toastId = toast.loading("جارِ حذف الدفعة");
    try {
      const response = await fetch(`/api/invoices/${id}/payments/${payment.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حذف الدفعة.");
      toast.update(toastId, { tone: "success", title: "تم حذف الدفعة", description: "تمت إعادة حساب رصيد الفاتورة." });
      if (editingId === payment.id) resetPaymentForm();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الدفعة.";
      toast.update(toastId, { tone: "error", title: "لم يتم الحذف", description: message });
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: Record<string, unknown>, successTitle: string) {
    if (busy) return;
    setBusy(true);
    const toastId = toast.loading("جارِ الحفظ", "بنجهّز التحديث…");
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تحديث الفاتورة.");
      toast.update(toastId, { tone: "success", title: successTitle, description: "تم تحديث بيانات الفاتورة." });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحديث الفاتورة.";
      toast.update(toastId, { tone: "error", title: "لم يتم التحديث", description: message });
    } finally {
      setBusy(false);
    }
  }

  function saveAll() {
    void patch(
      {
        deliveryFee: Number(fee) || 0,
        deliveryArea: area,
        discountType: type,
        discountValue: Number(value) || 0,
        notes: note,
        dueDate: due || null,
      },
      "تم تحديث الفاتورة",
    );
  }

  async function remove() {
    if (!window.confirm(`حذف الفاتورة ${invoiceNumber}نهائيًا؟`)) return;
    setBusy(true);
    const toastId = toast.loading("جارِ حذف الفاتورة");
    try {
      const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حذف الفاتورة.");
      toast.update(toastId, { tone: "success", title: "تم حذف الفاتورة" });
      router.push("/invoices");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الفاتورة.";
      toast.update(toastId, { tone: "error", title: "لم يتم الحذف", description: message });
      setBusy(false);
    }
  }

  return (
    <aside className="space-y-4">
      <section id="manage" className="app-card p-5">
        <div className="flex items-center gap-2">
          <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><Wallet size={19} /></span>
          <div>
            <h2 className="section-title">سجل التحصيل</h2>
            <p className="text-[10px] muted-2">دفعات متعددة بإيصال لكل دفعة.</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <div>
            <p className="text-[9px] font-bold muted-2">الإجمالي</p>
            <p className="money mt-1 text-[11px] font-black" style={{ color: "var(--ink)" }}>{formatMoney(total)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold muted-2">المحصّل</p>
            <p className="money mt-1 text-[11px] font-black" style={{ color: "var(--success)" }}>{formatMoney(paidAmount)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold muted-2">المتبقي</p>
            <p className="money mt-1 text-[11px] font-black" style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>{formatMoney(remaining)}</p>
          </div>
        </div>

        {cancelled && (
          <div className="mt-3 rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            هذه الفاتورة ملغاة. أعيدي تنشيطها لتعديل الدفع.
          </div>
        )}

        {!cancelled && (remaining > 0.001 || editingId !== null) && (
          <div className="mt-4 space-y-2.5 rounded-xl p-3" style={{ background: "var(--brand-soft)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black" style={{ color: "var(--brand-strong)" }}>
                {editingId ? "تعديل الدفعة" : "دفعة جديدة"}
              </p>
              {editingId && (
                <button type="button" onClick={resetPaymentForm} className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                  <X size={11} />إلغاء التعديل
                </button>
              )}
            </div>
            <label className="block">
              <span className="field-label">المبلغ</span>
              <span className="relative block">
                <Wallet size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-2)" }} />
                <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" inputMode="decimal" className="field pr-8 money" />
              </span>
            </label>
            {!editingId && (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setAmount(String(remaining))} className="btn btn-outline flex-1 px-2 py-1.5 text-[10px]">
                  <CheckCircle2 size={12} />المتبقي كامل
                </button>
                <button type="button" onClick={() => setAmount(String(Math.round((remaining / 2) * 100) / 100))} className="btn btn-outline flex-1 px-2 py-1.5 text-[10px]">نصف المتبقي</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="field-label">الطريقة</span>
                <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="field py-2 text-[11px]">
                  {PAYMENT_METHODS.map((entry) => <option key={entry} value={entry}>{paymentMethodLabels[entry]}</option>)}
                </select>
              </label>
              <DateField
                label="التاريخ"
                value={paidAt}
                onChange={setPaidAt}
                controlClassName="py-2 text-[11px]"
              />
            </div>
            <label className="block">
              <span className="field-label">الرقم المرجعي (اختياري)</span>
              <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} className="field py-2 text-[11px]" placeholder="رقم التحويل أو الإيصال" />
            </label>
            <label className="block">
              <span className="field-label">ملاحظات (اختياري)</span>
              <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} maxLength={500} className="field py-2 text-[11px]" />
            </label>
            <button type="button" onClick={submitPayment} disabled={busy} className="btn btn-primary w-full">
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={15} />}
              {editingId ? "حفظ تعديل الدفعة" : "تسجيل الدفعة وإصدار إيصال"}
            </button>
          </div>
        )}

        {!cancelled && remaining <= 0.001 && editingId === null && (
          <div className="mt-4 rounded-xl px-3 py-3 text-center text-[11px] font-black" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
            <CheckCircle2 size={18} className="mx-auto mb-1" />تم تحصيل الفاتورة بالكامل
          </div>
        )}

        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--line)" }}>
          <p className="mb-2 text-[11px] font-extrabold" style={{ color: "var(--ink-soft)" }}>الدفعات المسجلة ({payments.length})</p>
          {payments.length === 0 ? (
            <p className="rounded-xl px-3 py-4 text-center text-[11px] muted-2" style={{ background: "var(--surface-2)" }}>لا توجد دفعات مسجلة بعد.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-xl p-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/receipts/${payment.id}`} target="_blank" className="mono text-[11px] font-black" dir="ltr" style={{ color: "var(--brand-strong)" }}>
                      {payment.receipt_number}
                    </Link>
                    <span className="badge badge-muted">{paymentMethodLabels[payment.payment_method] ?? payment.payment_method}</span>
                    <span className="money mr-auto text-[12px] font-black" style={{ color: "var(--success)" }}>{formatMoney(payment.amount)}</span>
                  </div>
                  <p className="mt-1 text-[10px]" style={{ color: "var(--muted-2)" }}>
                    {formatDate(payment.paid_at)}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                    {payment.recorded_by ? ` · ${payment.recorded_by}` : ""}
                  </p>
                  {payment.notes && <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>{payment.notes}</p>}
                  <div className="mt-2 flex gap-1.5">
                    <Link href={`/receipts/${payment.id}`} target="_blank" className="btn btn-outline flex-1 px-2 py-1 text-[10px]"><Printer size={11} />إيصال</Link>
                    <button type="button" disabled={cancelled || busy} onClick={() => startEdit(payment)} className="btn btn-soft flex-1 px-2 py-1 text-[10px]"><Pencil size={11} />تعديل</button>
                    <button type="button" disabled={cancelled || busy} onClick={() => removePayment(payment)} className="btn btn-outline flex-1 px-2 py-1 text-[10px]" style={{ color: "var(--danger)" }}><Trash2 size={11} />حذف</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="app-card p-5">
        <div className="flex items-center gap-2">
          <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><CircleDollarSign size={19} /></span>
          <div>
            <h2 className="section-title">تفاصيل الفاتورة</h2>
            <p className="text-[10px] muted-2">الخصم والتوصيل وتاريخ الاستحقاق.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label>
            <span className="field-label">نوع الخصم</span>
            <select value={type} onChange={(event) => setType(event.target.value as DiscountType)} className="field py-2 text-[11px]" disabled={cancelled}>
              {DISCOUNT_TYPES.map((entry) => <option key={entry} value={entry}>{discountTypeLabels[entry]}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">قيمة الخصم</span>
            <input value={value} onChange={(event) => setValue(event.target.value)} type="number" min={0} step="0.01" inputMode="decimal" className="field py-2 text-[11px] money" disabled={cancelled} />
          </label>
          <label>
            <span className="field-label">رسوم التوصيل</span>
            <input value={fee} onChange={(event) => setFee(event.target.value)} type="number" min={0} step="0.01" inputMode="decimal" className="field py-2 text-[11px] money" disabled={cancelled} />
          </label>
          <DateField
            label="تاريخ الاستحقاق"
            value={due}
            onChange={setDue}
            disabled={cancelled}
            controlClassName="py-2 text-[11px]"
          />
          <label className="col-span-2">
            <span className="field-label">منطقة التوصيل</span>
            <input value={area} onChange={(event) => setArea(event.target.value)} maxLength={120} className="field py-2 text-[11px]" disabled={cancelled} />
          </label>
        </div>
        <label className="mt-2 block">
          <span className="field-label">ملاحظات</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} className="field resize-none py-2 text-[11px]" disabled={cancelled} />
        </label>
        <button type="button" onClick={saveAll} disabled={busy || cancelled} className="btn btn-primary mt-4 w-full">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Save size={15} />}
          حفظ تعديلات الفاتورة
        </button>
      </section>

      <section className="app-card p-4">
        <p className="mb-2 text-[10px] font-black tracking-[0.12em]" style={{ color: "var(--muted-2)" }}>إجراءات أخرى</p>
        <div className="grid gap-2">
          {cancelled ? (
            <button type="button" disabled={busy} onClick={() => patch({ status: "unpaid" }, "تم إعادة تنشيط الفاتورة")} className="btn btn-soft w-full">
              <RotateCcw size={15} />إعادة تنشيط الفاتورة
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (window.confirm(`إلغاء الفاتورة ${invoiceNumber}؟ سيتم الاحتفاظ بها في السجل.`)) patch({ status: "cancelled" }, "تم إلغاء الفاتورة"); }}
              className="btn btn-outline w-full"
              style={{ color: "var(--warning)" }}
            >
              <Ban size={15} />إلغاء الفاتورة
            </button>
          )}
          <button type="button" disabled={busy} onClick={remove} className="btn btn-danger w-full">
            <Trash2 size={15} />حذف الفاتورة نهائيًا
          </button>
          <Link href="/reports" className="btn btn-soft w-full"><FileText size={15} />التقارير والتحصيل</Link>
        </div>
      </section>
    </aside>
  );
}
