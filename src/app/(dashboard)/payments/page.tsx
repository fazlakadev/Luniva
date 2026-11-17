import Link from "next/link";
import { FileText, Plus, TrendingUp, Wallet } from "lucide-react";
import PaymentsList from "@/components/payments-list";
import { formatMoney, formatNumber } from "@/lib/format";
import { getInvoiceStats, getPaymentsLedger } from "@/lib/invoice-queries";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, stats] = await Promise.all([getPaymentsLedger(), getInvoiceStats()]);
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return (
    <div className="page-enter">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">تحصيلات لونيفا</p>
          <h1 className="page-title mt-1">سجل التحصيل</h1>
          <p className="page-subtitle mt-2 max-w-xl">كل الدفعات والإيصالات في مكان واحد، مع رابط سريع للفاتورة المرتبطة.</p>
        </div>
        <Link href="/invoices/new" className="btn btn-primary self-start sm:self-auto"><Plus size={18} />فاتورة جديدة</Link>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "إجمالي الإيصالات", value: formatNumber(payments.length), hint: "دفعة مسجلة", icon: Wallet, tone: "var(--brand-soft)", color: "var(--brand-strong)" },
          { label: "قيمة التحصيل", value: formatMoney(total), hint: "من إجمالي الدفعات المعروضة", icon: TrendingUp, tone: "var(--success-soft)", color: "var(--success)" },
          { label: "محصّل اليوم", value: formatMoney(stats.today_collected), hint: `${formatNumber(stats.today_count)} فاتورة اليوم`, icon: FileText, tone: "var(--warning-soft)", color: "var(--warning)" },
        ].map(({ label, value, hint, icon: Icon, tone, color }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold muted">{label}</p>
                <p className="mt-2 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon" style={{ background: tone, color }}><Icon size={19} /></span>
            </div>
          </article>
        ))}
      </section>

      <PaymentsList payments={payments} />
    </div>
  );
}
