"use client";

import Link from "next/link";
import { CalendarDays, FileText, Printer, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS, paymentMethodLabels, type PaymentMethod } from "@/lib/invoice-shared";

export type PaymentLedgerRow = {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number: string | null;
  customer_name: string | null;
  amount: string | number;
  payment_method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  recorded_by: string | null;
};

export default function PaymentsList({ payments }: { payments: PaymentLedgerRow[] }) {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"all" | PaymentMethod>("all");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter((payment) => {
      if (method !== "all" && payment.payment_method !== method) return false;
      if (!query) return true;
      return `${payment.receipt_number} ${payment.invoice_number ?? ""} ${payment.customer_name ?? ""} ${payment.reference ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [payments, search, method]);

  const total = visible.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const average = visible.length ? total / visible.length : 0;

  return (
    <div className="min-w-0">
      <div
        className="mb-4 grid gap-2 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_11rem]"
        style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        <label className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <Search size={16} className="shrink-0" style={{ color: "var(--muted-2)" }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحثي برقم الإيصال أو الفاتورة أو العميلة"
            aria-label="البحث في الدفعات"
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as "all" | PaymentMethod)}
          aria-label="تصفية حسب طريقة الدفع"
          className="field w-full py-2 text-[11px]"
        >
          <option value="all">كل الطرق</option>
          {PAYMENT_METHODS.map((entry) => <option key={entry} value={entry}>{paymentMethodLabels[entry]}</option>)}
        </select>
      </div>

      <div className="app-card mb-4 flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold muted">إجمالي الدفعات المعروضة</p>
          <p className="money mt-1 break-words text-xl font-black" style={{ color: "var(--success)" }}>{formatMoney(total)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-brand">{formatNumber(visible.length)} إيصال</span>
          {visible.length > 0 && <span className="badge badge-muted">متوسط {formatMoney(average)}</span>}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="app-card empty-state mt-4">
          <div className="min-w-0">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
              <Wallet size={28} />
            </span>
            <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد دفعات مطابقة</p>
            <p className="mx-auto mt-2 max-w-xs text-[12px] leading-6 muted">جرّبي كلمة بحث أخرى أو غيّري طريقة الدفع.</p>
            <Link href="/invoices" className="btn btn-primary mt-4 text-[11px]"><FileText size={15} />عرض الفواتير</Link>
          </div>
        </div>
      ) : (
        <div className="app-card mt-4 divide-y overflow-hidden p-1" style={{ borderColor: "var(--line)" }}>
          {visible.map((payment) => (
            <article
              key={payment.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-x-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                <Wallet size={18} />
              </span>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/receipts/${payment.id}`}
                    dir="ltr"
                    className="mono max-w-full truncate text-[12px] font-black hover:underline"
                    style={{ color: "var(--brand-strong)" }}
                  >
                    {payment.receipt_number}
                  </Link>
                  <span className="badge badge-muted">{paymentMethodLabels[payment.payment_method] ?? payment.payment_method}</span>
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]" style={{ color: "var(--muted)" }}>
                  <span className="min-w-0 truncate">{payment.customer_name ?? "—"}</span>
                  <span className="shrink-0">·</span>
                  <span className="mono min-w-0 truncate" dir="ltr">{payment.invoice_number ?? "—"}</span>
                  {payment.reference && (
                    <>
                      <span className="shrink-0">·</span>
                      <span className="min-w-0 truncate">{payment.reference}</span>
                    </>
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]" style={{ color: "var(--muted-2)" }}>
                  <CalendarDays size={11} className="shrink-0" />
                  <span>{formatDate(payment.paid_at)}</span>
                  {payment.recorded_by && <><span>·</span><span className="min-w-0 truncate">{payment.recorded_by}</span></>}
                </p>
              </div>

              <p className="money col-start-2 min-w-0 truncate text-[13px] font-black sm:col-start-auto sm:text-[14px]" style={{ color: "var(--success)" }}>
                {formatMoney(payment.amount)}
              </p>

              <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:flex sm:items-center">
                <Link href={`/receipts/${payment.id}`} className="btn btn-outline whitespace-nowrap px-2.5 py-1.5 text-[10px]">
                  <Printer size={12} />إيصال
                </Link>
                <Link href={`/invoices/${payment.invoice_id}`} className="btn btn-soft whitespace-nowrap px-2.5 py-1.5 text-[10px]">
                  <FileText size={12} />الفاتورة
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
