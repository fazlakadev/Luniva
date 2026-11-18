"use client";

import Link from "next/link";
import {
  ArrowUpLeft,
  CalendarDays,
  CircleDollarSign,
  Eye,
  MapPin,
  Pencil,
  ReceiptText,
  Search,
  Truck,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import {
  deliveryStatusLabels,
  invoiceStatusLabels,
  paymentMethodLabels,
  type DeliveryStatus,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/invoice-shared";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_area: string | null;
  subtotal: string | number;
  discount_amount: string | number;
  delivery_fee: string | number;
  total: string | number;
  paid_amount: string | number;
  status: InvoiceStatus;
  delivery_status?: DeliveryStatus;
  payment_method: PaymentMethod;
  created_at: string;
  due_date: string | null;
  overdue_days: number | string;
  remaining: string | number;
  payments_count: number;
  items_count: number;
  units_count: number;
  item_names: string[] | null;
};

const statusStyle: Record<InvoiceStatus, string> = {
  unpaid: "badge-danger",
  partial: "badge-warning",
  paid: "badge-success",
  cancelled: "badge-muted",
};

type TabKey = "all" | "overdue" | InvoiceStatus;

const statusTabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "overdue", label: "متأخرة" },
  { key: "unpaid", label: "غير مدفوعة" },
  { key: "partial", label: "جزئية" },
  { key: "paid", label: "مدفوعة" },
  { key: "cancelled", label: "ملغاة" },
];

export default function InvoicesList({
  invoices,
  customers = [],
  selectedCustomer = "",
}: {
  invoices: InvoiceRow[];
  customers?: Array<{ id: string; full_name: string }>;
  selectedCustomer?: string;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: invoices.length };
    for (const invoice of invoices) {
      map[invoice.status] = (map[invoice.status] ?? 0) + 1;
      if (Number(invoice.overdue_days) > 0) map.overdue = (map.overdue ?? 0) + 1;
    }
    return map;
  }, [invoices]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (tab === "overdue" && Number(invoice.overdue_days) <= 0) return false;
      if (tab !== "all" && tab !== "overdue" && invoice.status !== tab) return false;
      if (!query) return true;
      const haystack = [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer_phone ?? "",
        invoice.delivery_area ?? "",
        ...(invoice.item_names ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [invoices, search, tab]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <Search size={16} style={{ color: "var(--muted-2)" }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحثي برقم الفاتورة أو اسم العميلة أو المنتج"
            className="w-full min-w-0 bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>
        {customers.length > 0 && (
          <select
            value={selectedCustomer}
            onChange={(event) => {
              window.location.assign(event.target.value ? `/invoices?customer=${event.target.value}` : "/invoices");
            }}
            className="field w-full py-2 text-[11px] sm:w-48"
          >
            <option value="">كل العميلات</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {statusTabs.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition"
                style={
                  active
                    ? { background: "var(--brand)", color: "#fff", border: "1px solid var(--brand)" }
                    : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }
                }
              >
                {label}
                <span
                  className="rounded-full px-1.5 text-[9px]"
                  style={active ? { background: "rgba(255,255,255,.22)" } : { background: "var(--surface-3)" }}
                >
                  {formatNumber(counts[key] ?? 0)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="app-card empty-state">
          <div>
            <ReceiptText size={34} className="mx-auto mb-3" style={{ color: "var(--muted-2)" }} />
            <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد فواتير مطابقة</p>
            <p className="mt-1 text-sm muted">ابدئي فاتورة جديدة أو غيّري كلمة البحث والفلتر.</p>
            <Link href="/invoices/new" className="btn btn-primary mt-4"><ReceiptText size={15} />فاتورة جديدة</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((invoice) => {
            const paid = Number(invoice.paid_amount || 0);
            const total = Number(invoice.total || 0);
            const remaining = Math.max(0, total - paid);
            const units = Number(invoice.units_count || 0);
            const names = invoice.item_names ?? [];
            return (
              <article key={invoice.id} className="app-card overflow-hidden p-4 transition hover:-translate-y-0.5 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                      style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--lav-soft))", color: "var(--brand-strong)" }}
                    >
                      <ReceiptText size={21} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/invoices/${invoice.id}`} className="mono text-sm font-black tracking-wide hover:underline" dir="ltr" style={{ color: "var(--ink)" }}>
                          {invoice.invoice_number}
                        </Link>
                        <span className={`badge ${statusStyle[invoice.status] ?? "badge-muted"}`}>
                          {invoiceStatusLabels[invoice.status] ?? invoice.status}
                        </span>
                        {invoice.delivery_status && (
                          <span className="badge badge-brand"><Truck size={11} />{deliveryStatusLabels[invoice.delivery_status] ?? invoice.delivery_status}</span>
                        )}
                        <span className="badge badge-muted"><CalendarDays size={11} />{formatDate(invoice.created_at)}</span>
                        {Number(invoice.overdue_days) > 0 && (
                          <span className="badge badge-danger">متأخرة {formatNumber(invoice.overdue_days)} يوم</span>
                        )}
                        <span className="badge badge-lav"><Wallet size={11} />{paymentMethodLabels[invoice.payment_method] ?? invoice.payment_method}</span>
                        {Number(invoice.payments_count) > 0 && (
                          <span className="badge badge-success">{formatNumber(invoice.payments_count)} دفعة</span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{invoice.customer_name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--muted-2)" }}>
                        {invoice.customer_phone && <span className="mono" dir="ltr">{invoice.customer_phone}</span>}
                        {invoice.delivery_area && <span className="inline-flex items-center gap-1"><MapPin size={11} />{invoice.delivery_area}</span>}
                        <span>{formatNumber(invoice.items_count)} عنصر · {formatNumber(units)} قطعة</span>
                      </p>
                      <p className="mt-2 line-clamp-1 text-[11px]" style={{ color: "var(--muted)" }}>
                        {names.slice(0, 3).join("، ")}
                        {names.length > 3 ? ` +${formatNumber(names.length - 3)}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 rounded-xl p-3 text-center lg:w-[330px]" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                    <div>
                      <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>الإجمالي</p>
                      <p className="money mt-1 text-[13px]" style={{ color: "var(--ink)" }}>{formatMoney(total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>المدفوع</p>
                      <p className="money mt-1 text-[13px]" style={{ color: "var(--success)" }}>{formatMoney(paid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>المتبقي</p>
                      <p className="money mt-1 text-[13px]" style={{ color: remaining > 0 ? "var(--danger)" : "var(--muted-2)" }}>{formatMoney(remaining)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <Link href={`/invoices/${invoice.id}`} className="btn btn-outline min-w-0 flex-1 px-3 py-2 text-[11px] lg:flex-none">
                      <Eye size={14} /><span className="sm:hidden">عرض</span><span className="hidden sm:inline">عرض وطباعة</span>
                    </Link>
                    <Link href={`/invoices/${invoice.id}#manage`} className="btn btn-soft min-w-0 flex-1 px-3 py-2 text-[11px] lg:flex-none">
                      <CircleDollarSign size={14} />تحصيل
                    </Link>
                    <Link href={`/invoices/${invoice.id}/edit`} className="btn btn-outline min-w-0 flex-1 px-3 py-2 text-[11px] lg:flex-none">
                      <Pencil size={14} />تعديل
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {visible.length > 0 && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--muted-2)" }}>
          <ArrowUpLeft size={12} />{formatNumber(visible.length)} فاتورة معروضة من إجمالي {formatNumber(invoices.length)}
        </p>
      )}
    </>
  );
}
