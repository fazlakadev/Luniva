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

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <Search size={16} style={{ color: "var(--muted-2)" }} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثي برقم الإيصال أو الفاتورة أو العميلة" className="w-full min-w-0 bg-transparent text-sm outline-none" style={{ color: "var(--ink)" }} />
        </label>
        <select value={method} onChange={(event) => setMethod(event.target.value as "all" | PaymentMethod)} className="field w-full py-2 text-[11px] sm:w-44">
          <option value="all">كل الطرق</option>
          {PAYMENT_METHODS.map((entry) => <option key={entry} value={entry}>{paymentMethodLabels[entry]}</option>)}
        </select>
      </div>

      <div className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold muted">إجمالي الدفعات المعروضة</p>
            <p className="money mt-1 text-xl font-black" style={{ color: "var(--success)" }}>{formatMoney(total)}</p>
          </div>
          <span className="badge badge-brand">{formatNumber(visible.length)} إيصال</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="app-card empty-state mt-4">
          <div>
            <Wallet size={32} className="mx-auto mb-3" style={{ color: "var(--muted-2)" }} />
            <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد دفعات مطابقة</p>
            <Link href="/invoices" className="btn btn-primary mt-4"><FileText size={15} />عرض الفواتير</Link>
          </div>
        </div>
      ) : (
        <div className="app-card mt-4 divide-y p-1" style={{ borderColor: "var(--line)" }}>
          {visible.map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--success-soft)", color: "var(--success)" }}><Wallet size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/receipts/${payment.id}`} className="mono text-[12px] font-black" dir="ltr" style={{ color: "var(--brand-strong)" }}>{payment.receipt_number}</Link>
                  <span className="badge badge-muted">{paymentMethodLabels[payment.payment_method] ?? payment.payment_method}</span>
                </div>
                <p className="mt-1 truncate text-[11px]" style={{ color: "var(--muted)" }}>
                  {payment.customer_name ?? "—"} · <span className="mono" dir="ltr">{payment.invoice_number}</span>
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </p>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted-2)" }}><CalendarDays size={10} className="inline" /> {formatDate(payment.paid_at)}{payment.recorded_by ? ` · ${payment.recorded_by}` : ""}</p>
              </div>
              <p className="money text-[13px] font-black" style={{ color: "var(--success)" }}>{formatMoney(payment.amount)}</p>
              <Link href={`/receipts/${payment.id}`} className="btn btn-outline px-2.5 py-1.5 text-[10px]"><Printer size={12} />إيصال</Link>
              <Link href={`/invoices/${payment.invoice_id}`} className="btn btn-soft px-2.5 py-1.5 text-[10px]"><FileText size={12} />الفاتورة</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
