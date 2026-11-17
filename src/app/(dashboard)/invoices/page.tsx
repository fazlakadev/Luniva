import Link from "next/link";
import {
  CircleDollarSign,
  Plus,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import InvoicesList, { type InvoiceRow } from "@/components/invoices-list";
import { db, ensureCustomersTable } from "@/lib/db";
import { getInvoiceStats, getInvoicesList } from "@/lib/invoice-queries";
import { formatMoney, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const customerParam = query.customer;
  const customerId = typeof customerParam === "string" ? customerParam : "";
  await ensureCustomersTable();
  const [rows, stats, customersResult] = await Promise.all([
    getInvoicesList(customerId || null),
    getInvoiceStats(),
    db.query("SELECT id, full_name FROM customers ORDER BY full_name"),
  ]);

  const statsCards = [
    {
      label: "إجمالي الفواتير",
      value: formatNumber(stats.invoices),
      hint: `${formatNumber(stats.today_count)} فاتورة اليوم`,
      icon: ReceiptText,
      tone: "brand",
    },
    {
      label: "إجمالي المبيعات",
      value: formatMoney(stats.billed),
      hint: "بدون الفواتير الملغاة",
      icon: TrendingUp,
      tone: "lav",
    },
    {
      label: "المحصّل",
      value: formatMoney(stats.collected),
      hint: `${formatNumber(stats.paid)} فاتورة مدفوعة بالكامل`,
      icon: Wallet,
      tone: "success",
    },
    {
      label: "المتبقي على العملاء",
      value: formatMoney(stats.outstanding),
      hint: `${formatNumber(stats.unpaid)} غير مدفوعة · ${formatNumber(stats.partial)} جزئية`,
      icon: CircleDollarSign,
      tone: "warning",
    },
  ];

  const toneStyles: Record<string, { background: string; color: string }> = {
    brand: { background: "var(--brand-soft)", color: "var(--brand-strong)" },
    lav: { background: "var(--lav-soft)", color: "var(--lav-strong)" },
    success: { background: "var(--success-soft)", color: "var(--success)" },
    warning: { background: "var(--warning-soft)", color: "var(--warning)" },
  };

  return (
    <div className="page-enter">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Luniva invoicing</p>
          <h1 className="page-title mt-1">الفواتير والتحصيل</h1>
          <p className="page-subtitle mt-2 max-w-xl">
            أنشئي فواتير المنتجات والبكدجات ومتغيراتها، طباعيها، وطبّقي الخصم والتوصيل وتابعي المدفوع والمتبقي.
          </p>
        </div>
        <Link href="/invoices/new" className="btn btn-primary self-start sm:self-auto">
          <Plus size={18} />فاتورة جديدة
        </Link>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold muted">{label}</p>
                <p className="money mt-2 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon shrink-0" style={toneStyles[tone]}><Icon size={19} /></span>
            </div>
          </article>
        ))}
      </section>

      <InvoicesList invoices={rows as InvoiceRow[]} customers={customersResult.rows} selectedCustomer={customerId} />
    </div>
  );
}
