import Link from "next/link";
import { BarChart3, Download, FileText, TrendingUp, Wallet } from "lucide-react";
import InvoiceCta from "@/components/invoice-cta";
import PaymentsList from "@/components/payments-list";
import { formatMoney, formatNumber } from "@/lib/format";
import { getInvoiceStats, getPaymentsLedger } from "@/lib/invoice-queries";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, stats] = await Promise.all([getPaymentsLedger(), getInvoiceStats()]);
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return (
    <div className="page-enter min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">تحصيلات لونيفا</p>
          <h1 className="page-title mt-1">سجل التحصيل</h1>
          <p className="page-subtitle mt-2 max-w-xl text-[12px] leading-7 sm:text-sm">
            كل الدفعات والإيصالات في مكان واحد، مع رابط سريع للفاتورة المرتبطة.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link href="/reports" className="btn btn-outline w-full text-[11px] sm:w-auto">
            <BarChart3 size={15} />التقارير
          </Link>
          <a href="/api/reports/export?type=payments" className="btn btn-soft w-full text-[11px] sm:w-auto">
            <Download size={15} />تصدير الدفعات
          </a>
          <InvoiceCta href="/invoices/new" label="فاتورة جديدة" variant="compact" className="w-full sm:w-auto" />
        </div>
      </div>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "إجمالي الإيصالات", value: formatNumber(payments.length), hint: "دفعة مسجلة", icon: Wallet, tone: "var(--brand-soft)", color: "var(--brand-strong)" },
          { label: "قيمة التحصيل", value: formatMoney(total), hint: "من إجمالي الدفعات المعروضة", icon: TrendingUp, tone: "var(--success-soft)", color: "var(--success)" },
          { label: "محصّل اليوم", value: formatMoney(stats.today_collected), hint: `${formatNumber(stats.today_count)} فاتورة اليوم`, icon: FileText, tone: "var(--warning-soft)", color: "var(--warning)" },
        ].map(({ label, value, hint, icon: Icon, tone, color }) => (
          <article key={label} className="stat-card min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold muted">{label}</p>
                <p className="money mt-2 break-words text-[17px] font-extrabold leading-tight sm:text-xl" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 truncate text-[10px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon shrink-0" style={{ background: tone, color }}><Icon size={18} /></span>
            </div>
          </article>
        ))}
      </section>

      <PaymentsList payments={payments} />
    </div>
  );
}
