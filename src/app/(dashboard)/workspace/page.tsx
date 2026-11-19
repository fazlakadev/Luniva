import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Boxes,
  CircleDollarSign,
  Gift,
  Layers3,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
  Settings2,
  Sparkles,
  TrendingUp,
  Truck,
  UsersRound,
  Wallet,
} from "lucide-react";
import InvoiceCta from "@/components/invoice-cta";
import { getRecentActivity } from "@/lib/activity";
import { db, ensureCustomersTable, ensureInvoiceTables, ensurePackagesTables, ensureSuppliersTable } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";
import { invoiceStatusLabels, type InvoiceStatus } from "@/lib/invoices";

type Overview = {
  customers: number;
  suppliers: number;
  products: number;
  variants: number;
  packages: number;
  subPackages: number;
  stock: number;
  startingPrice: number;
  bestDiscount: number;
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
};

const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  unpaid: "badge-danger",
  partial: "badge-warning",
  paid: "badge-success",
  cancelled: "badge-muted",
};

export default async function WorkspacePage() {
  await Promise.all([ensureCustomersTable(), ensureSuppliersTable(), ensurePackagesTables(), ensureInvoiceTables()]);
  const overviewResult = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM customers) AS customers,
      (SELECT COUNT(*)::int FROM suppliers) AS suppliers,
      (SELECT COUNT(*)::int FROM products) AS products,
      (SELECT COUNT(*)::int FROM product_variants) AS variants,
      (SELECT COUNT(*)::int FROM packages) AS packages,
      (SELECT COUNT(*)::int FROM package_variants) AS sub_packages,
      (SELECT COALESCE(SUM(stock), 0)::int FROM package_variants) AS stock,
      (SELECT COALESCE(MIN(price_after_discount), 0) FROM package_variants) AS starting_price,
      (SELECT COALESCE(MAX(price_before_discount - price_after_discount), 0) FROM package_variants) AS best_discount,
      (SELECT COUNT(*)::int FROM invoices WHERE status <> 'cancelled') AS invoices,
      (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status <> 'cancelled') AS billed,
      (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE status <> 'cancelled') AS collected,
      (SELECT COALESCE(SUM(GREATEST(total - paid_amount, 0)), 0) FROM invoices WHERE status <> 'cancelled') AS outstanding
  `);
  const row = overviewResult.rows[0] ?? {};
  const overview: Overview = {
    customers: Number(row.customers ?? 0),
    suppliers: Number(row.suppliers ?? 0),
    products: Number(row.products ?? 0),
    variants: Number(row.variants ?? 0),
    packages: Number(row.packages ?? 0),
    subPackages: Number(row.sub_packages ?? 0),
    stock: Number(row.stock ?? 0),
    startingPrice: Number(row.starting_price ?? 0),
    bestDiscount: Number(row.best_discount ?? 0),
    invoices: Number(row.invoices ?? 0),
    billed: Number(row.billed ?? 0),
    collected: Number(row.collected ?? 0),
    outstanding: Number(row.outstanding ?? 0),
  };

  const recent = await db.query(`
    SELECT p.id, p.name, p.image_url, p.status,
      COALESCE((SELECT MIN(v.price_after_discount) FROM package_variants v WHERE v.package_id = p.id), p.price_after_discount) AS starting_price,
      COALESCE((SELECT MIN(v.price_before_discount) FROM package_variants v WHERE v.package_id = p.id), p.price_before_discount) AS before_price
    FROM packages p
    ORDER BY p.created_at DESC
    LIMIT 3
  `);

  const recentInvoices = await db.query(`
    SELECT id, invoice_number, customer_name, total, paid_amount, status, created_at
    FROM invoices
    ORDER BY created_at DESC
    LIMIT 4
  `);

  const [alertResult, activity] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM invoices
          WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE) AS overdue_count,
        (SELECT COALESCE(SUM(GREATEST(total - paid_amount, 0)), 0) FROM invoices
          WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE) AS overdue_amount,
        (SELECT COUNT(*)::int FROM package_variants WHERE stock <= 5) AS low_stock,
        (SELECT COUNT(*)::int FROM invoice_payments WHERE paid_at >= date_trunc('day', NOW())) AS receipts_today
    `),
    getRecentActivity(5),
  ]);
  const alerts = alertResult.rows[0] ?? {};
  const collectionRate =
    overview.billed > 0
      ? Math.max(0, Math.min(100, Math.round((overview.collected / overview.billed) * 100)))
      : 0;

  const stats = [
    { label: "العملاء", value: formatNumber(overview.customers), hint: "عميلة مسجلة", icon: UsersRound, tone: "brand" },
    { label: "المنتجات", value: formatNumber(overview.products), hint: `${formatNumber(overview.variants)} متغير لون ومقاس`, icon: Package, tone: "lav" },
    { label: "البكدجات", value: formatNumber(overview.packages), hint: `${formatNumber(overview.subPackages)} توليفة · ${formatNumber(overview.stock)} قطعة`, icon: Gift, tone: "success" },
    { label: "الفواتير", value: formatNumber(overview.invoices), hint: `${formatMoney(overview.collected)} محصّل`, icon: ReceiptText, tone: "warning" },
  ];

  const toneStyles: Record<string, { background: string; color: string }> = {
    brand: { background: "var(--brand-soft)", color: "var(--brand-strong)" },
    lav: { background: "var(--lav-soft)", color: "var(--lav-strong)" },
    success: { background: "var(--success-soft)", color: "var(--success)" },
    warning: { background: "var(--warning-soft)", color: "var(--warning)" },
  };

  const systems = [
    {
      href: "/customers",
      title: "إدارة العملاء",
      description: "ملفات العميلات، أرقام التواصل، والصور في دليل مرتب.",
      meta: `${formatNumber(overview.customers)} عميلة`,
      icon: UsersRound,
      tone: "brand",
    },
    {
      href: "/products",
      title: "إدارة المنتجات",
      description: "أكواد رئيسية وفرعية ومتغيرات الألوان والمقاسات والأسعار.",
      meta: `${formatNumber(overview.products)} منتج · ${formatNumber(overview.variants)} متغير`,
      icon: Package,
      tone: "lav",
    },
    {
      href: "/packages",
      title: "البكدجات والعروض",
      description: "اجمعي المنتجات في بكدج واحد وولّدي كل التوليفات بأسعارها.",
      meta: `${formatNumber(overview.packages)} بكدج · ${formatNumber(overview.subPackages)} توليفة`,
      icon: Gift,
      tone: "success",
    },
    {
      href: "/invoices",
      title: "الفواتير والتحصيل",
      description: "إصدار فواتير المنتجات والبكدجات، الخصم والتوصيل والطباعة.",
      meta: `${formatNumber(overview.invoices)} فاتورة · ${formatMoney(overview.outstanding)} متبقي`,
      icon: ReceiptText,
      tone: "warning",
    },
    {
      href: "/payments",
      title: "سجل التحصيل",
      description: "دفعات متعددة، إيصالات قابلة للطباعة، ومتابعة الرصيد لحظة بلحظة.",
      meta: `${formatNumber(alerts.receipts_today)} إيصال اليوم`,
      icon: Wallet,
      tone: "success",
    },
    {
      href: "/profits",
      title: "نظام الأرباح",
      description: "سعر التوريد مقابل سعر البيع، الفرق والربح النهائي لكل منتج وبكدج.",
      meta: "هامش وربح لحظي",
      icon: TrendingUp,
      tone: "lav",
    },
    {
      href: "/suppliers",
      title: "الموردون",
      description: "دليل الموردين وأسعار التوريد المرتبطة بكل متغير من متغيرات المنتجات.",
      meta: `${formatNumber(overview.suppliers)} مورد مسجل`,
      icon: Truck,
      tone: "success",
    },
    {
      href: "/reports",
      title: "التقارير والتحليلات",
      description: "التحصيل حسب الطريقة، أعمار المتأخرات، وأعلى العملاء مديونية.",
      meta: `${formatNumber(alerts.overdue_count)} فاتورة متأخرة`,
      icon: BarChart3,
      tone: "lav",
    },
    {
      href: "/settings",
      title: "الإعدادات",
      description: "بيانات الشركة وشروط الدفع وتخصيص رأس الفاتورة والإيصال.",
      meta: "جاهز للتخصيص",
      icon: Settings2,
      tone: "brand",
    },
  ];

  return (
    <>
      <section className="ws-hero">
        <div className="ws-hero__orbit" aria-hidden="true" />
        <div className="ws-hero__grid">
          <div className="min-w-0">
            <span className="ws-hero__eyebrow">
              <Sparkles size={14} />LUNIVA OS · مركز القيادة
            </span>
            <h1 className="ws-hero__title">
              مركز قيادة <span className="ws-hero__accent">لونيفا</span>
            </h1>
            <p className="ws-hero__lead">
              من أول عميلة لآخر تحصيل، تابعي المبيعات والمخزون والأرباح من لوحة واحدة مصممة لسرعة قرارك.
            </p>
            <div className="ws-hero__chips">
              <span className="ws-hero__chip"><ReceiptText size={13} />{formatNumber(overview.invoices)} فاتورة</span>
              <span className="ws-hero__chip"><Wallet size={13} />{formatMoney(overview.collected)} محصّل</span>
              <span className="ws-hero__chip"><UsersRound size={13} />{formatNumber(overview.customers)} عميلة</span>
            </div>
            <div className="ws-hero__actions">
              <InvoiceCta href="/invoices/new" label="فاتورة جديدة" variant="compact" className="txn-cta--on-dark" />
              <Link href="/packages/new" className="ws-hero__action"><Gift size={16} />بكدج جديد</Link>
              <Link href="/products/new" className="ws-hero__action"><Boxes size={16} />منتج جديد</Link>
              <details className="ws-hero__more">
                <summary className="ws-hero__action"><MoreHorizontal size={16} />المزيد</summary>
                <div className="ws-hero__menu">
                  <Link href="/profits"><TrendingUp size={14} />الأرباح</Link>
                  <Link href="/suppliers"><Truck size={14} />الموردون</Link>
                  <Link href="/payments"><Wallet size={14} />سجل التحصيل</Link>
                  <Link href="/reports"><BarChart3 size={14} />التقارير</Link>
                </div>
              </details>
            </div>
          </div>

          <aside className="ws-pulse" aria-label="نبض اليوم">
            <div className="ws-pulse__head">
              <div>
                <p className="ws-pulse__eyebrow">نبض اليوم</p>
                <p className="ws-pulse__title">حالة التحصيل</p>
              </div>
              <span className="ws-pulse__live"><i />مباشر</span>
            </div>
            <div
              className="ws-pulse__ring"
              style={{ background: `conic-gradient(from -90deg, rgba(217, 201, 255, 0.96) 0 ${collectionRate}%, rgba(255, 255, 255, 0.14) ${collectionRate}% 100%)` }}
            >
              <div className="ws-pulse__ring-core">
                <strong>{formatNumber(collectionRate)}%</strong>
                <span>تم تحصيله</span>
              </div>
            </div>
            <div className="ws-pulse__mini">
              <div>
                <span className="ws-pulse__mini-label">إيصالات اليوم</span>
                <strong>{formatNumber(Number(alerts.receipts_today ?? 0))}</strong>
              </div>
              <div>
                <span className="ws-pulse__mini-label">متأخرات</span>
                <strong>{formatNumber(Number(alerts.overdue_count ?? 0))}</strong>
              </div>
            </div>
            <div className="ws-pulse__footer">
              <div className="ws-pulse__footer-row">
                <span>المتبقي</span>
                <strong className="money">{formatMoney(overview.outstanding)}</strong>
              </div>
              <div className="ws-pulse__bar"><span style={{ width: `${collectionRate}%` }} /></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, tone }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold muted">{label}</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon" style={toneStyles[tone]}><Icon size={19} /></span>
            </div>
          </article>
        ))}
      </section>

      {(Number(alerts.overdue_count) > 0 || Number(alerts.low_stock) > 0) && (
        <section className="mt-6">
          <div className="flex items-center gap-2">
            <BellRing size={16} style={{ color: "var(--warning)" }} />
            <h2 className="section-title">تنبيهات تحتاج متابعة</h2>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Number(alerts.overdue_count) > 0 && (
              <Link href="/invoices" className="app-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                <span className="stat-icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><CircleDollarSign size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black" style={{ color: "var(--ink)" }}>{formatNumber(alerts.overdue_count)} فاتورة متأخرة</p>
                  <p className="text-[11px] muted">بقيمة {formatMoney(alerts.overdue_amount)} — راجعي التحصيل اليوم.</p>
                </div>
              </Link>
            )}
            {Number(alerts.low_stock) > 0 && (
              <Link href="/packages" className="app-card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
                <span className="stat-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><Boxes size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black" style={{ color: "var(--ink)" }}>{formatNumber(alerts.low_stock)} توليفة مخزونها منخفض</p>
                  <p className="text-[11px] muted">٥ قطع أو أقل — حدّثي الكميات قبل البيع.</p>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">مساحات العمل</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>الأنظمة</h2>
          </div>
          <span className="badge badge-brand">{formatNumber(systems.length)} أنظمة نشطة</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {systems.map(({ href, title, description, meta, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group app-card relative overflow-hidden p-6 transition hover:-translate-y-1"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <span className="stat-icon" style={toneStyles[tone]}><Icon size={24} /></span>
              <h3 className="mt-6 text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 muted">{description}</p>
              <div className="mt-6 flex items-center justify-between border-t pt-4 text-xs font-extrabold" style={{ borderColor: "var(--line)", color: "var(--brand-strong)" }}>
                <span>{meta}</span>
                <span className="flex items-center gap-1 transition group-hover:gap-2">فتح النظام <ArrowLeft size={15} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">الفواتير والتحصيل</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>الفواتير والتحصيل</h2>
          </div>
          <Link href="/invoices" className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
            عرض الكل <ArrowLeft size={14} />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="app-card p-5">
            <div className="space-y-3">
              {[
                { label: "إجمالي المبيعات", value: overview.billed, icon: ReceiptText, color: "var(--brand-strong)", bg: "var(--brand-soft)" },
                { label: "المحصّل", value: overview.collected, icon: Wallet, color: "var(--success)", bg: "var(--success-soft)" },
                { label: "المتبقي", value: overview.outstanding, icon: CircleDollarSign, color: "var(--warning)", bg: "var(--warning-soft)" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="stat-icon" style={{ background: bg, color }}><Icon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold muted">{label}</p>
                    <p className="money text-sm" style={{ color: "var(--ink)" }}>{formatMoney(value)}</p>
                  </div>
                </div>
              ))}
            </div>
            <InvoiceCta href="/invoices/new" label="فاتورة جديدة" variant="compact" className="mt-4 w-full" />
          </div>

          <div className="app-card p-2 sm:p-3">
            {recentInvoices.rows.length === 0 ? (
              <div className="empty-state" style={{ minHeight: "12rem" }}>
                <div>
                  <ReceiptText size={28} className="mx-auto mb-2" style={{ color: "var(--muted-2)" }} />
                  <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>لا توجد فواتير بعد</p>
                  <p className="mt-1 text-xs muted">ابدئي أول فاتورة بيع من المنتجات أو البكدجات.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {recentInvoices.rows.map((invoice) => {
                  const status = invoice.status as InvoiceStatus;
                  const remaining = Math.max(0, Number(invoice.total) - Number(invoice.paid_amount));
                  return (
                    <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex flex-wrap items-center gap-2.5 px-2 py-3 transition hover:bg-[var(--surface-2)] sm:flex-nowrap">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                        <ReceiptText size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="mono text-[11px] font-black" dir="ltr" style={{ color: "var(--ink)" }}>{invoice.invoice_number}</p>
                        <p className="truncate text-[11px]" style={{ color: "var(--muted)" }}>{invoice.customer_name} · {formatDate(invoice.created_at)}</p>
                      </div>
                      <div className="text-left">
                        <p className="money text-[11px]" style={{ color: "var(--ink)" }}>{formatMoney(invoice.total)}</p>
                        {remaining > 0 && <p className="text-[9px]" style={{ color: "var(--danger)" }}>متبقي {formatMoney(remaining)}</p>}
                      </div>
                      <span className={`badge ${invoiceStatusStyle[status] ?? "badge-muted"} shrink-0`}>{invoiceStatusLabels[status] ?? status}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">أحدث العروض</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>أحدث البكدجات</h2>
          </div>
          <Link href="/packages" className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
            عرض الكل <ArrowLeft size={14} />
          </Link>
        </div>

        {recent.rows.length === 0 ? (
          <div className="app-card empty-state">
            <div>
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                <Gift size={28} />
              </span>
              <p className="font-extrabold" style={{ color: "var(--ink)" }}>لم تُنشئي أي بكدج بعد</p>
              <p className="mx-auto mt-2 max-w-sm text-sm muted">اجمعي منتجين أو أكثر في بكدج واحد، ثم ولّدي كل الألوان والمقاسات بأسعارها تلقائيًا.</p>
              <Link href="/packages/new" className="btn btn-primary mt-5"><Plus size={16} />إنشاء أول بكدج</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recent.rows.map((item) => {
              const before = Number(item.before_price || 0);
              const after = Number(item.starting_price || 0);
              const percent = discountPercent(before, after);
              return (
                <Link key={item.id} href={`/packages/${item.id}`} className="app-card group flex items-center gap-3 overflow-hidden p-3 transition hover:-translate-y-0.5">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                    {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <Layers3 size={24} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{item.name}</p>
                    <p className="mt-1 text-xs muted">يبدأ من <b style={{ color: "var(--brand-strong)" }}>{formatMoney(after)}</b></p>
                    {percent > 0 && <span className="badge badge-success mt-1.5">خصم {formatNumber(percent)}%</span>}
                  </div>
                  <ArrowLeft size={16} className="shrink-0 transition group-hover:-translate-x-0.5" style={{ color: "var(--muted-2)" }} />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">آخر النشاطات</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>آخر النشاطات</h2>
          </div>
          <Link href="/payments" className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
            سجل التحصيل <ArrowLeft size={14} />
          </Link>
        </div>
        <div className="app-card divide-y p-2" style={{ borderColor: "var(--line)" }}>
          {activity.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs muted">ستظهر هنا آخر العمليات مثل إنشاء الفاتورة وتسجيل الدفع.</p>
          ) : activity.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: "var(--surface-2)", color: "var(--brand-strong)" }}>
                {item.entity_type === "payment" ? <Wallet size={15} /> : <ReceiptText size={15} />}
              </span>
              <p className="min-w-0 flex-1 truncate text-[11px] font-bold" style={{ color: "var(--ink-soft)" }}>{item.summary}</p>
              <span className="text-[10px]" style={{ color: "var(--muted-2)" }}>{formatDate(item.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
