import Link from "next/link";
import { ArrowLeft, CircleDollarSign, Download, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { agingLabels, paymentMethodLabels, type PaymentMethod } from "@/lib/invoice-shared";
import { getReportData } from "@/lib/invoice-queries";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const report = await getReportData();
  const summary = report.summary as Record<string, string | number>;
  const methods = report.methods as Array<{ method: PaymentMethod; count: number; amount: string | number }>;
  const monthly = report.monthly as Array<{ month: string; amount: string | number; count: number }>;
  const aging = report.aging as Array<{ bucket: string; count: number; amount: string | number }>;
  const debtors = report.debtors as Array<{ customer_id: string; customer_name: string; balance: string | number; invoices: number }>;

  const collected = Number(summary.collected ?? 0);
  const billed = Number(summary.billed ?? 0);
  const outstanding = Number(summary.outstanding ?? 0);
  const collectionRate = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 0;
  const maxMethod = Math.max(1, ...methods.map((row) => Number(row.amount)));
  const maxMonth = Math.max(1, ...monthly.map((row) => Number(row.amount)));
  const maxDebtor = Math.max(1, ...debtors.map((row) => Number(row.balance)));

  const monthLabels: Record<string, string> = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل", "05": "مايو", "06": "يونيو",
    "07": "يوليو", "08": "أغسطس", "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
  };
  const monthLabel = (value: string) => {
    const [year, month] = value.split("-");
    return `${monthLabels[month] ?? month} ${year}`;
  };
  const shortMonthLabel = (value: string) => {
    const [year, month] = value.split("-");
    return `${(monthLabels[month] ?? month).slice(0, 3)} ${year.slice(-2)}`;
  };

  return (
    <div className="page-enter">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">تحليلات لونيفا</p>
          <h1 className="page-title mt-1">التقارير والتحصيل</h1>
          <p className="page-subtitle mt-2 max-w-xl">نظرة شاملة على المبيعات والتحصيل وأعمار المتأخرات وأعلى العملاء مديونية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/reports/export?type=invoices" className="btn btn-outline"><Download size={16} />تصدير الفواتير</a>
          <a href="/api/reports/export?type=payments" className="btn btn-soft"><Download size={16} />تصدير الدفعات</a>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "إجمالي المبيعات", value: formatMoney(billed), hint: `${formatNumber(summary.invoices)} فاتورة`, icon: ReceiptText, bg: "var(--brand-soft)", color: "var(--brand-strong)" },
          { label: "إجمالي المحصّل", value: formatMoney(collected), hint: `${formatNumber(summary.payments)} دفعة`, icon: Wallet, bg: "var(--success-soft)", color: "var(--success)" },
          { label: "المتبقي", value: formatMoney(outstanding), hint: `نسبة التحصيل ${formatNumber(collectionRate)}%`, icon: TrendingUp, bg: "var(--lav-soft)", color: "var(--lav-strong)" },
          { label: "متوسط الدفعة", value: formatMoney(summary.avg_payment), hint: "لكل إيصال تحصيل", icon: CircleDollarSign, bg: "var(--warning-soft)", color: "var(--warning)" },
        ].map(({ label, value, hint, icon: Icon, bg, color }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold muted">{label}</p>
                <p className="money mt-2 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon" style={{ background: bg, color }}><Icon size={19} /></span>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="app-card p-5">
          <h2 className="section-title">التحصيل حسب طريقة الدفع</h2>
          <div className="mt-5 space-y-4">
            {methods.length === 0 ? <p className="text-sm muted">لا توجد دفعات بعد.</p> : methods.map((row) => {
              const width = Math.max(4, Math.round((Number(row.amount) / maxMethod) * 100));
              return (
                <div key={row.method}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold" style={{ color: "var(--ink-soft)" }}>{paymentMethodLabels[row.method] ?? row.method} ({formatNumber(row.count)})</span>
                    <span className="money font-black" style={{ color: "var(--ink)" }}>{formatMoney(row.amount)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: "linear-gradient(90deg, var(--brand), var(--brand-strong))" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="app-card p-5">
          <h2 className="section-title">اتجاه التحصيل (آخر ٦ أشهر)</h2>
          <div className="mobile-scroll mt-5 pb-2">
            <div className="flex h-44 min-w-[360px] items-end justify-between gap-2" style={{ borderBottom: "1px solid var(--line)" }}>
              {monthly.length === 0 ? <p className="mx-auto self-center text-sm muted">لا توجد بيانات كافية.</p> : monthly.map((row) => {
                const height = Math.max(6, Math.round((Number(row.amount) / maxMonth) * 100));
                return (
                  <div key={row.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="money text-[9px] font-black" style={{ color: "var(--brand-strong)" }}>{formatMoney(row.amount)}</span>
                    <div className="w-full max-w-12 rounded-t-lg" style={{ height: `${height}%`, background: "linear-gradient(180deg, var(--brand), var(--lav))" }} />
                    <span className="whitespace-nowrap text-[9px] sm:hidden" style={{ color: "var(--muted-2)" }}>{shortMonthLabel(row.month)}</span>
                    <span className="hidden whitespace-nowrap text-[9px] sm:inline" style={{ color: "var(--muted-2)" }}>{monthLabel(row.month)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="app-card p-5">
          <h2 className="section-title">أعمار المتأخرات</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-right text-[11px]">
              <thead>
                <tr style={{ color: "var(--muted-2)" }}>
                  <th className="pb-2 font-bold">الفئة</th>
                  <th className="pb-2 font-bold">الفواتير</th>
                  <th className="pb-2 text-left font-bold">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {aging.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center muted">لا توجد فواتير معلّقة.</td></tr>
                ) : aging.map((row) => (
                  <tr key={row.bucket} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="py-2.5 font-bold" style={{ color: "var(--ink-soft)" }}>{agingLabels[row.bucket] ?? row.bucket}</td>
                    <td className="py-2.5" style={{ color: "var(--muted)" }}>{formatNumber(row.count)}</td>
                    <td className="money py-2.5 text-left font-black" style={{ color: row.bucket === "current" ? "var(--ink)" : "var(--danger)" }}>{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="app-card p-5">
          <h2 className="section-title">أعلى العملاء مديونية</h2>
          <div className="mt-4 space-y-3">
            {debtors.length === 0 ? <p className="text-sm muted">لا توجد أرصدة مستحقة.</p> : debtors.map((row, index) => (
              <div key={row.customer_id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                  <Link href={`/customers/${row.customer_id}/statement`} className="min-w-0 truncate font-bold hover:underline" style={{ color: "var(--ink-soft)" }}>
                    {formatNumber(index + 1)}. {row.customer_name}
                  </Link>
                  <span className="money font-black" style={{ color: "var(--danger)" }}>{formatMoney(row.balance)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.round((Number(row.balance) / maxDebtor) * 100))}%`, background: "var(--danger)" }} />
                </div>
              </div>
            ))}
          </div>
          <a href="/api/reports/export?type=customers" className="btn btn-outline mt-5 w-full"><Download size={15} />تصدير دليل العملاء</a>
        </section>
      </div>

      <p className="mt-5 text-center text-[10px]" style={{ color: "var(--muted-2)" }}>آخر تحديث: {formatDate(new Date().toISOString())}</p>
    </div>
  );
}
