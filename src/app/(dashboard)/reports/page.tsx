import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  Download,
  ReceiptText,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { agingLabels, paymentMethodLabels, type PaymentMethod } from "@/lib/invoice-shared";
import { getReportData } from "@/lib/invoice-queries";

export const dynamic = "force-dynamic";

type SectionHeaderProps = {
  icon: typeof Wallet;
  tone: string;
  color: string;
  title: string;
  description: string;
};

function SectionHeader({ icon: Icon, tone, color, title, description }: SectionHeaderProps) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="stat-icon shrink-0" style={{ background: tone, color }}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        <p className="mt-1 text-[11px] leading-5 muted">{description}</p>
      </div>
    </div>
  );
}

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
    <div className="page-enter min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">تحليلات لونيفا</p>
          <h1 className="page-title mt-1">التقارير والتحصيل</h1>
          <p className="page-subtitle mt-2 max-w-xl text-[12px] leading-7 sm:text-sm">
            نظرة شاملة على المبيعات والتحصيل وأعمار المتأخرات وأعلى العملاء مديونية.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <a href="/api/reports/export?type=invoices" className="btn btn-outline w-full text-[11px] sm:w-auto">
            <Download size={15} />تصدير الفواتير
          </a>
          <a href="/api/reports/export?type=payments" className="btn btn-soft w-full text-[11px] sm:w-auto">
            <Download size={15} />تصدير الدفعات
          </a>
        </div>
      </div>

      <section className="app-card mb-5 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="stat-icon shrink-0" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
              <Target size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black" style={{ color: "var(--ink)" }}>نسبة تحصيل الفواتير</p>
              <p className="mt-1 text-[11px] leading-6 muted">
                {formatMoney(collected)} من {formatMoney(billed)} إجمالي مبيعات
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right sm:text-left">
            <p className="money text-2xl font-black" style={{ color: "var(--brand-strong)" }}>{formatNumber(collectionRate)}%</p>
            <p className="text-[10px] font-bold muted-2">متبقي {formatMoney(outstanding)}</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${collectionRate}%`, background: "linear-gradient(90deg, var(--lav), var(--brand))" }}
          />
        </div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "إجمالي المبيعات", value: formatMoney(billed), hint: `${formatNumber(summary.invoices)} فاتورة`, icon: ReceiptText, bg: "var(--brand-soft)", color: "var(--brand-strong)" },
          { label: "إجمالي المحصّل", value: formatMoney(collected), hint: `${formatNumber(summary.payments)} دفعة`, icon: Wallet, bg: "var(--success-soft)", color: "var(--success)" },
          { label: "المتبقي", value: formatMoney(outstanding), hint: `نسبة التحصيل ${formatNumber(collectionRate)}%`, icon: TrendingUp, bg: "var(--lav-soft)", color: "var(--lav-strong)" },
          { label: "متوسط الدفعة", value: formatMoney(summary.avg_payment), hint: "لكل إيصال تحصيل", icon: CircleDollarSign, bg: "var(--warning-soft)", color: "var(--warning)" },
        ].map(({ label, value, hint, icon: Icon, bg, color }) => (
          <article key={label} className="stat-card min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold muted">{label}</p>
                <p className="money mt-2 break-words text-[17px] font-extrabold leading-tight sm:text-xl" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 truncate text-[10px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon shrink-0" style={{ background: bg, color }}><Icon size={18} /></span>
            </div>
          </article>
        ))}
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <section className="app-card min-w-0 p-4 sm:p-5">
          <SectionHeader
            icon={Wallet}
            tone="var(--brand-soft)"
            color="var(--brand-strong)"
            title="التحصيل حسب طريقة الدفع"
            description="توزيع المبالغ المسجلة حسب وسيلة الدفع."
          />
          <div className="mt-5 space-y-4">
            {methods.length === 0 ? (
              <p className="text-sm muted">لا توجد دفعات بعد.</p>
            ) : (
              methods.map((row) => {
                const width = Math.max(4, Math.round((Number(row.amount) / maxMethod) * 100));
                return (
                  <div key={row.method} className="min-w-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate font-bold" style={{ color: "var(--ink-soft)" }}>
                        {paymentMethodLabels[row.method] ?? row.method} ({formatNumber(row.count)})
                      </span>
                      <span className="money shrink-0 font-black" style={{ color: "var(--ink)" }}>{formatMoney(row.amount)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${width}%`, background: "linear-gradient(90deg, var(--brand), var(--brand-strong))" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="app-card min-w-0 p-4 sm:p-5">
          <SectionHeader
            icon={TrendingUp}
            tone="var(--success-soft)"
            color="var(--success)"
            title="اتجاه التحصيل"
            description="إجمالي التحصيل خلال آخر ٦ أشهر."
          />
          {monthly.length === 0 ? (
            <p className="mt-5 text-sm muted">لا توجد بيانات كافية.</p>
          ) : (
            <div className="mt-5">
              <div
                className="grid items-end gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${monthly.length}, minmax(0, 1fr))`, height: "10.5rem" }}
              >
                {monthly.map((row) => {
                  const height = Math.max(6, Math.round((Number(row.amount) / maxMonth) * 100));
                  return (
                    <div key={row.month} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                      <span
                        className="money hidden w-full truncate text-center text-[9px] font-black sm:block"
                        style={{ color: "var(--brand-strong)" }}
                        title={`${monthLabel(row.month)}: ${formatMoney(row.amount)}`}
                      >
                        {formatMoney(row.amount)}
                      </span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${height}%`,
                          minHeight: "6px",
                          background: "linear-gradient(180deg, var(--brand), var(--lav))",
                        }}
                        title={`${monthLabel(row.month)}: ${formatMoney(row.amount)} · ${formatNumber(row.count)} دفعة`}
                      />
                      <span className="w-full truncate text-center text-[9px] font-bold" style={{ color: "var(--muted-2)" }} title={monthLabel(row.month)}>
                        {shortMonthLabel(row.month)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[9px] font-bold muted-2">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} />إجمالي التحصيل</span>
                <span>آخر تحديث: {formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          )}
        </section>

        <section className="app-card min-w-0 p-4 sm:p-5">
          <SectionHeader
            icon={CalendarDays}
            tone="var(--warning-soft)"
            color="var(--warning)"
            title="أعمار المتأخرات"
            description="الفواتير المعلّقة مصنّفة حسب عمر الدين."
          />
          <div className="mt-4 min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] gap-2 border-b pb-2 text-[10px] font-black" style={{ borderColor: "var(--line)", color: "var(--muted-2)" }}>
              <span>الفئة</span>
              <span className="text-center">الفواتير</span>
              <span className="text-left">المبلغ</span>
            </div>
            {aging.length === 0 ? (
              <p className="py-5 text-center text-sm muted">لا توجد فواتير معلّقة.</p>
            ) : (
              aging.map((row) => (
                <div
                  key={row.bucket}
                  className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1fr)] items-center gap-2 border-b py-2.5 text-[11px] last:border-0"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span className="min-w-0 truncate font-bold" style={{ color: "var(--ink-soft)" }}>
                    {agingLabels[row.bucket] ?? row.bucket}
                  </span>
                  <span className="text-center" style={{ color: "var(--muted)" }}>{formatNumber(row.count)}</span>
                  <span
                    className="money min-w-0 truncate text-left font-black"
                    style={{ color: row.bucket === "current" ? "var(--ink)" : "var(--danger)" }}
                  >
                    {formatMoney(row.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="app-card min-w-0 p-4 sm:p-5">
          <SectionHeader
            icon={Users}
            tone="var(--danger-soft)"
            color="var(--danger)"
            title="أعلى العملاء مديونية"
            description="ترتيب الأرصدة المستحقة حسب القيمة."
          />
          <div className="mt-4 space-y-2.5">
            {debtors.length === 0 ? (
              <p className="text-sm muted">لا توجد أرصدة مستحقة.</p>
            ) : (
              debtors.map((row, index) => (
                <div key={row.customer_id} className="min-w-0 rounded-xl p-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/customers/${row.customer_id}/statement`} className="flex min-w-0 items-center gap-2 hover:underline">
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] font-black"
                        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                      >
                        {formatNumber(index + 1)}
                      </span>
                      <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: "var(--ink-soft)" }}>
                        {row.customer_name}
                      </span>
                    </Link>
                    <span className="money shrink-0 text-[11px] font-black" style={{ color: "var(--danger)" }}>
                      {formatMoney(row.balance)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, Math.round((Number(row.balance) / maxDebtor) * 100))}%`, background: "var(--danger)" }}
                    />
                  </div>
                  <p className="mt-1 text-[9px] font-bold muted-2">{formatNumber(row.invoices)} فاتورة</p>
                </div>
              ))
            )}
          </div>
          <a href="/api/reports/export?type=customers" className="btn btn-outline mt-5 w-full text-[11px]">
            <Download size={15} />تصدير دليل العملاء
          </a>
        </section>
      </div>
    </div>
  );
}
