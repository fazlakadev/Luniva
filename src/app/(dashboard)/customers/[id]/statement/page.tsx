import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import PrintButton from "@/components/print-button";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { paymentMethodLabels, type PaymentMethod } from "@/lib/invoice-shared";
import { getCustomerStatement } from "@/lib/invoice-queries";

export const dynamic = "force-dynamic";

type Entry = {
  id: string;
  date: string;
  type: "invoice" | "payment";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  href: string;
};

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const statement = await getCustomerStatement(id);
  if (!statement) notFound();

  const { customer, balance, invoices, payments } = statement;
  const entries: Entry[] = [
    ...invoices.map((invoice) => ({
      id: invoice.id,
      date: invoice.created_at,
      type: "invoice" as const,
      reference: invoice.invoice_number,
      description: "فاتورة مبيعات",
      debit: Number(invoice.total),
      credit: Number(invoice.paid_amount),
      href: `/invoices/${invoice.id}`,
    })),
    ...payments.map((payment) => ({
      id: payment.id,
      date: payment.paid_at,
      type: "payment" as const,
      reference: payment.receipt_number,
      description: `تحصيل (${paymentMethodLabels[payment.payment_method as PaymentMethod] ?? payment.payment_method})`,
      debit: 0,
      credit: Number(payment.amount),
      href: `/receipts/${payment.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Running balance walks backward from the current balance to keep the statement readable.
  const { rows: withBalance } = entries.reduce<{ rows: Array<Entry & { balance: number }>; running: number }>(
    (state, entry) => ({
      rows: [...state.rows, { ...entry, balance: state.running }],
      running: Math.round((state.running - entry.credit + entry.debit) * 100) / 100,
    }),
    { rows: [], running: Number(balance.balance) },
  );

  return (
    <div className="page-enter">
      <div className="print-hidden mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href={`/customers/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
            <ArrowRight size={13} />ملف العميلة
          </Link>
          <p className="eyebrow">كشف حساب العميلة</p>
          <h1 className="page-title mt-1">كشف حساب العميلة</h1>
          <p className="page-subtitle mt-2">{customer.full_name} · <span className="mono" dir="ltr">{customer.phone}</span></p>
        </div>
        <PrintButton label="طباعة كشف الحساب" />
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "الرصيد المستحق", value: formatMoney(balance.balance), icon: CircleDollarSign, bg: "var(--danger-soft)", color: "var(--danger)" },
          { label: "إجمالي المبيعات", value: formatMoney(balance.billed), icon: ReceiptText, bg: "var(--brand-soft)", color: "var(--brand-strong)" },
          { label: "إجمالي المحصّل", value: formatMoney(balance.collected), icon: Wallet, bg: "var(--success-soft)", color: "var(--success)" },
          { label: "المتأخر", value: formatMoney(balance.overdue), icon: CircleDollarSign, bg: "var(--warning-soft)", color: "var(--warning)" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold muted">{label}</p>
                <p className="money mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{value}</p>
              </div>
              <span className="stat-icon" style={{ background: bg, color }}><Icon size={19} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="app-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4" style={{ borderColor: "var(--line)" }}>
          <h2 className="section-title">حركة الحساب</h2>
          <span className="badge badge-brand">{formatNumber(withBalance.length)} عملية</span>
        </div>
        {withBalance.length === 0 ? (
          <div className="empty-state"><div><p className="font-extrabold">لا توجد حركة لهذه العميلة بعد.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-right text-[11px]">
              <thead>
                <tr style={{ background: "var(--surface-2)", color: "var(--muted-2)" }}>
                  <th className="px-4 py-2.5 font-bold">التاريخ</th>
                  <th className="px-4 py-2.5 font-bold">البيان</th>
                  <th className="px-4 py-2.5 font-bold">الرقم</th>
                  <th className="px-4 py-2.5 text-left font-bold">مدين</th>
                  <th className="px-4 py-2.5 text-left font-bold">دائن</th>
                  <th className="px-4 py-2.5 text-left font-bold">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: "var(--muted-2)" }}>{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${entry.type === "invoice" ? "badge-lav" : "badge-success"}`}>
                        {entry.type === "invoice" ? "فاتورة" : "تحصيل"}
                      </span>
                      <span className="mr-2" style={{ color: "var(--ink-soft)" }}>{entry.description}</span>
                    </td>
                    <td className="mono px-4 py-3" dir="ltr" style={{ color: "var(--ink-soft)" }}>
                      <Link href={entry.href} className="hover:underline">{entry.reference}</Link>
                    </td>
                    <td className="money px-4 py-3 text-left" style={{ color: entry.debit ? "var(--danger)" : "var(--muted-2)" }}>{entry.debit ? formatMoney(entry.debit) : "—"}</td>
                    <td className="money px-4 py-3 text-left" style={{ color: entry.credit ? "var(--success)" : "var(--muted-2)" }}>{entry.credit ? formatMoney(entry.credit) : "—"}</td>
                    <td className="money px-4 py-3 text-left font-black" style={{ color: entry.balance > 0 ? "var(--danger)" : "var(--success)" }}>{formatMoney(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
