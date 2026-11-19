import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Filter,
  Layers3,
  Package,
  Store,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { db, ensureSuppliersTable } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { getProfitReport, type ProfitFilters } from "@/lib/profit-queries";

export const dynamic = "force-dynamic";

type NumericRow = Record<string, string | number | null>;

const monthNames: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل", "05": "مايو", "06": "يونيو",
  "07": "يوليو", "08": "أغسطس", "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${monthNames[month] ?? month} ${year}`;
}

export default async function ProfitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const pick = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const from = pick("from");
  const to = pick("to");
  const supplierId = pick("supplier");
  const type = pick("type");
  const filters: ProfitFilters = {
    from: from || undefined,
    to: to || undefined,
    supplierId: supplierId || undefined,
    type: type === "product" || type === "package" ? type : "all",
  };

  await ensureSuppliersTable();
  const [report, supplierOptions] = await Promise.all([
    getProfitReport(filters),
    db.query("SELECT id, name FROM suppliers ORDER BY name"),
  ]);

  const overview = report.overview as NumericRow;
  const summary = report.summary as NumericRow;
  const products = report.products as NumericRow[];
  const supplierRows = report.suppliers as NumericRow[];
  const monthly = report.monthly as NumericRow[];
  const lines = report.lines as NumericRow[];

  const revenue = Number(summary.revenue ?? 0);
  const cost = Number(summary.cost ?? 0);
  const profit = Number(summary.profit ?? 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const allProfit = Number(overview.all_profit ?? 0);
  const todayProfit = Number(overview.today_profit ?? 0);
  const monthProfit = Number(overview.month_profit ?? 0);
  const maxMonth = Math.max(1, ...monthly.map((row) => Math.abs(Number(row.profit ?? 0))));
  const maxProduct = Math.max(1, ...products.map((row) => Math.abs(Number(row.profit ?? 0))));
  const activeFilters = Boolean(from || to || supplierId || type && type !== "all");
  const exportQuery = new URLSearchParams({ type: "profits" });
  if (from) exportQuery.set("from", from);
  if (to) exportQuery.set("to", to);
  if (supplierId) exportQuery.set("supplier", supplierId);
  if (type !== "all") exportQuery.set("itemType", type);

  const kpis = [
    { label: "المبيعات الصافية", value: formatMoney(revenue), hint: "بعد خصم الفاتورة", icon: Wallet, tone: "var(--brand-soft)", color: "var(--brand-strong)" },
    { label: "تكلفة التوريد", value: formatMoney(cost), hint: `${formatNumber(Number(summary.units ?? 0))} وحدة مباعة`, icon: Package, tone: "var(--lav-soft)", color: "var(--lav-strong)" },
    { label: "الربح الصافي", value: formatMoney(profit), hint: `${formatNumber(Number(summary.invoices ?? 0))} فاتورة`, icon: TrendingUp, tone: "var(--success-soft)", color: "var(--success)" },
    { label: "هامش الربح", value: `${formatNumber(margin)}%`, hint: "من المبيعات الصافية", icon: Target, tone: "var(--warning-soft)", color: "var(--warning)" },
  ];

  return (
    <div className="page-enter min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">تحليل ربح لونيفا</p>
          <h1 className="page-title mt-1">نظام الأرباح والهوامش</h1>
          <p className="page-subtitle mt-2 max-w-xl text-[12px] leading-7 sm:text-sm">
            سعر التوريد يُسجَّل لكل متغير، ويُحتفظ بنسخة منه في كل فاتورة ليُحسب الربح الحقيقي حتى لو تغيّرت الأسعار لاحقًا.
          </p>
        </div>
        <a href={`/api/reports/export?${exportQuery.toString()}`} className="btn btn-outline self-start text-[11px]">
          <Download size={15} />تصدير تفاصيل الأرباح
        </a>
      </div>

      <section className="app-card mb-5 overflow-hidden p-4 sm:p-5">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
          <label>
            <span className="field-label">من تاريخ</span>
            <input type="date" name="from" defaultValue={from} className="field py-2.5 text-xs" />
          </label>
          <label>
            <span className="field-label">إلى تاريخ</span>
            <input type="date" name="to" defaultValue={to} className="field py-2.5 text-xs" />
          </label>
          <label>
            <span className="field-label">المورد</span>
            <select name="supplier" defaultValue={supplierId} className="field py-2.5 text-xs">
              <option value="">كل الموردين</option>
              {supplierOptions.rows.map((option) => (
                <option key={String(option.id)} value={String(option.id)}>{String(option.name)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">نوع الصنف</span>
            <select name="type" defaultValue={filters.type} className="field py-2.5 text-xs">
              <option value="all">الكل</option>
              <option value="product">منتجات</option>
              <option value="package">بكدجات</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary text-[11px]"><Filter size={14} />تطبيق</button>
          {activeFilters && <Link href="/profits" className="btn btn-outline text-center text-[11px]">مسح</Link>}
        </form>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, tone, color }) => (
          <div key={label} className="app-card flex items-center gap-3 p-4">
            <span className="stat-icon shrink-0" style={{ background: tone, color }}><Icon size={18} /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold muted-2">{label}</p>
              <p className="money mt-1 truncate text-lg font-black" style={{ color: "var(--ink)" }}>{value}</p>
              <p className="mt-0.5 truncate text-[10px] muted-2">{hint}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="balance-report mb-5 overflow-hidden p-5 sm:p-6">
        <span aria-hidden="true" className="balance-report__glow" />
        <span aria-hidden="true" className="balance-report__mesh" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em]" style={{ color: "var(--brand-strong)" }}>
              <TrendingUp size={13} />LUNIVA PROFIT ENGINE
            </p>
            <h2 className="mt-2 text-[15px] font-black" style={{ color: "var(--ink)" }}>الربح النهائي المحتسب</h2>
            <p className="money mt-4 break-all text-[1.9rem] font-black leading-none sm:text-[2.4rem]" style={{ color: "var(--ink)" }}>
              {formatMoney(profit)}
            </p>
            <p className="mt-2 text-[11px] font-bold muted">
              {formatMoney(allProfit)} إجماليًا · {formatMoney(todayProfit)} اليوم · {formatMoney(monthProfit)} هذا الشهر
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, margin))}%`, background: "linear-gradient(90deg, var(--lav), var(--brand))" }} />
              </div>
              <span className="money shrink-0 text-xs font-black" style={{ color: "var(--brand-strong)" }}>{formatNumber(margin)}%</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
              <span className="badge badge-success">بيع {formatMoney(revenue)}</span>
              <span className="badge badge-warning">توريد {formatMoney(cost)}</span>
              <span className="badge badge-lav">{formatNumber(Number(summary.lines ?? 0))} سطر فاتورة</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {monthly.length === 0 && <p className="text-xs muted">لا توجد بيانات كافية للرسم البياني.</p>}
            {monthly.map((row) => {
              const value = Number(row.profit ?? 0);
              const month = String(row.month ?? "");
              return (
                <div key={month} className="min-w-0 rounded-2xl px-3 py-2.5" style={{ background: "color-mix(in srgb, var(--surface) 78%, transparent)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-bold muted-2">{monthLabel(month)}</span>
                    <span className="money shrink-0 text-[11px] font-black" style={{ color: value >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(value)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(value) / maxMonth) * 100)}%`, background: value >= 0 ? "var(--success)" : "var(--danger)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="app-card overflow-hidden">
          <div className="flex items-center gap-3 border-b p-4 sm:p-5" style={{ borderColor: "var(--line)" }}>
            <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Package size={18} /></span>
            <div>
              <h2 className="section-title">الأصناف الأكثر ربحًا</h2>
              <p className="mt-0.5 text-xs muted">مرتبة حسب الربح المحقق في الفترة المختارة.</p>
            </div>
          </div>
          {products.length === 0 ? (
            <p className="px-5 py-12 text-center text-xs muted">لا توجد مبيعات محسوبة بعد.</p>
          ) : (
            <div className="space-y-2.5 p-4 sm:p-5">
              {products.map((row, index) => {
                const value = Number(row.profit ?? 0);
                const itemRevenue = Number(row.revenue ?? 0);
                const itemMargin = itemRevenue > 0 ? (value / itemRevenue) * 100 : 0;
                return (
                  <div key={`${String(row.ref_id)}-${index}`} className="rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold" style={{ color: "var(--ink)" }}>{String(row.name ?? "—")}</p>
                        <p className="mt-0.5 text-[10px] muted-2">
                          {row.item_type === "package" ? "بكدج" : "منتج"} · {formatNumber(Number(row.units ?? 0))} وحدة · {formatNumber(Number(row.orders ?? 0))} فاتورة
                        </p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="money text-sm font-black" style={{ color: value >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(value)}</p>
                        <p className="text-[10px] font-bold muted-2">{formatNumber(itemMargin)}% هامش</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(value) / maxProduct) * 100)}%`, background: "linear-gradient(90deg, var(--lav), var(--brand))" }} />
                    </div>
                    <p className="mt-1.5 text-[10px] muted">
                      بيع {formatMoney(row.revenue)} · توريد {formatMoney(row.cost)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-card overflow-hidden">
          <div className="flex items-center gap-3 border-b p-4 sm:p-5" style={{ borderColor: "var(--line)" }}>
            <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Store size={18} /></span>
            <div>
              <h2 className="section-title">أداء الموردين</h2>
              <p className="mt-0.5 text-xs muted">الربح الناتج عن أصناف كل مورد.</p>
            </div>
          </div>
          {supplierRows.length === 0 ? (
            <p className="px-5 py-12 text-center text-xs muted">لا توجد بيانات موردين في هذه الفترة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-right text-xs">
                <thead>
                  <tr className="border-b text-[10px] muted-2" style={{ borderColor: "var(--line)" }}>
                    <th className="px-5 py-3 font-bold">المورد</th>
                    <th className="px-3 py-3 font-bold">الوحدات</th>
                    <th className="px-3 py-3 font-bold">التكلفة</th>
                    <th className="px-5 py-3 text-left font-bold">الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.map((row, index) => {
                    const value = Number(row.profit ?? 0);
                    return (
                      <tr key={`${String(row.supplier_id ?? "none")}-${index}`} className="border-b last:border-0" style={{ borderColor: "var(--line)" }}>
                        <td className="px-5 py-3 font-extrabold" style={{ color: "var(--ink)" }}>
                          {String(row.supplier_name ?? "بدون مورد")}
                          <span className="mt-0.5 block text-[10px] font-normal muted-2">{formatNumber(Number(row.lines ?? 0))} سطر</span>
                        </td>
                        <td className="px-3 py-3 muted">{formatNumber(Number(row.units ?? 0))}</td>
                        <td className="money px-3 py-3 muted">{formatMoney(row.cost)}</td>
                        <td className="money px-5 py-3 text-left font-black" style={{ color: value >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="app-card mt-5 overflow-hidden">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><Layers3 size={18} /></span>
            <div>
              <h2 className="section-title">تفاصيل أرباح الفواتير</h2>
              <p className="mt-0.5 text-xs muted">أحدث ٥٠ سطرًا · السعر النهائي بعد خصم الفاتورة.</p>
            </div>
          </div>
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-[11px] font-extrabold hover:underline" style={{ color: "var(--lav-strong)" }}>
            تقارير التحصيل <ArrowLeft size={13} />
          </Link>
        </div>
        {lines.length === 0 ? (
          <div className="grid place-items-center px-5 py-14 text-center">
            <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><CalendarDays size={22} /></span>
            <p className="mt-4 text-sm font-extrabold" style={{ color: "var(--ink)" }}>لا توجد فواتير محسوبة في هذه الفترة</p>
            <p className="mt-1 text-xs muted">جرّبي توسيع نطاق التاريخ أو مسح عوامل التصفية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-xs">
              <thead>
                <tr className="border-b text-[10px] muted-2" style={{ borderColor: "var(--line)" }}>
                  <th className="px-5 py-3 font-bold">الفاتورة / التاريخ</th>
                  <th className="px-3 py-3 font-bold">الصنف</th>
                  <th className="px-3 py-3 font-bold">العميلة</th>
                  <th className="px-3 py-3 font-bold">الكمية</th>
                  <th className="px-3 py-3 font-bold">البيع</th>
                  <th className="px-3 py-3 font-bold">التوريد</th>
                  <th className="px-5 py-3 text-left font-bold">الربح</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, index) => {
                  const value = Number(row.profit ?? 0);
                  return (
                    <tr key={`${String(row.invoice_number)}-${index}`} className="border-b last:border-0 hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--line)" }}>
                      <td className="px-5 py-3">
                        <span className="mono font-bold" style={{ color: "var(--brand-strong)" }}>{String(row.invoice_number ?? "")}</span>
                        <span className="mt-0.5 block text-[10px] muted-2">{formatDate(row.created_at == null ? null : String(row.created_at))}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold" style={{ color: "var(--ink)" }}>{String(row.name ?? "—")}</span>
                        <span className="mt-0.5 block text-[10px] muted-2">{row.item_type === "package" ? "بكدج" : "منتج"}</span>
                      </td>
                      <td className="px-3 py-3 muted">{String(row.customer_name ?? "—")}</td>
                      <td className="px-3 py-3 muted">{formatNumber(Number(row.quantity ?? 0))}</td>
                      <td className="money px-3 py-3" style={{ color: "var(--ink-soft)" }}>{formatMoney(row.net_revenue)}</td>
                      <td className="money px-3 py-3 muted">{formatMoney(row.cost)}</td>
                      <td className="money px-5 py-3 text-left font-black" style={{ color: value >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
