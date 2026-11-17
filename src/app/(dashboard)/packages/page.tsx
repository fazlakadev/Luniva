import Link from "next/link";
import { ArrowUpRight, Boxes, Gift, Layers3, Plus, Sparkles, Tags } from "lucide-react";
import PackagesList, { type PackageRow } from "@/components/packages-list";
import { getPackagesList } from "@/lib/package-queries";
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";

export default async function PackagesPage() {
  const rows = (await getPackagesList()) as PackageRow[];
  const active = rows.filter((item) => item.status === "active").length;
  const subPackages = rows.reduce((sum, item) => sum + Number(item.variants_count || 0), 0);
  const stock = rows.reduce((sum, item) => sum + Number(item.stock_total || 0), 0);
  const bestDiscount = rows.reduce((best, item) => Math.max(best, discountPercent(Number(item.starting_before_price), Number(item.starting_price))), 0);
  const startingPrice = rows.length ? Math.min(...rows.map((item) => Number(item.starting_price || 0))) : 0;

  const stats = [
    { label: "إجمالي البكدجات", value: formatNumber(rows.length), hint: `${formatNumber(active)} بكدج نشط`, icon: Gift, tone: "brand" },
    { label: "البكدجات الفرعية", value: formatNumber(subPackages), hint: "توليفات لون ومقاس", icon: Layers3, tone: "lav" },
    { label: "المخزون المتاح", value: formatNumber(stock), hint: "قطعة عبر التوليفات", icon: Boxes, tone: "success" },
    { label: "أعلى خصم", value: `${formatNumber(bestDiscount)}%`, hint: startingPrice ? `يبدأ من ${formatMoney(startingPrice)}` : "لا توجد عروض بعد", icon: Tags, tone: "warning" },
  ];

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">استوديو عروض لونيفا</p>
          <h1 className="page-title mt-1">البكدجات والعروض</h1>
          <p className="page-subtitle mt-2 max-w-xl">أنشئي بكدجًا رئيسيًا من عدة منتجات، ثم ولّدي بكدجات فرعية بكل الألوان والمقاسات مع حساب الخصم والسعر تلقائيًا.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/products/new" className="btn btn-outline">
            <Boxes size={17} />إضافة منتج
          </Link>
          <Link href="/packages/new" className="btn btn-primary">
            <Plus size={18} />إنشاء بكدج
          </Link>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, tone }) => {
          const toneStyle =
            tone === "lav"
              ? { background: "var(--lav-soft)", color: "var(--lav-strong)" }
              : tone === "success"
                ? { background: "var(--success-soft)", color: "var(--success)" }
                : tone === "warning"
                  ? { background: "var(--warning-soft)", color: "var(--warning)" }
                  : { background: "var(--brand-soft)", color: "var(--brand-strong)" };
          return (
            <article key={label} className="stat-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold muted">{label}</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{value}</p>
                  <p className="mt-1 text-[11px] muted-2">{hint}</p>
                </div>
                <span className="stat-icon" style={toneStyle}><Icon size={19} /></span>
              </div>
            </article>
          );
        })}
      </section>

      {rows.length > 0 ? (
        <PackagesList packages={rows} />
      ) : (
        <section className="app-card relative overflow-hidden">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full" style={{ background: "var(--brand-soft)", opacity: 0.7 }} />
          <div className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full" style={{ background: "var(--lav-soft)", opacity: 0.65 }} />
          <div className="relative grid gap-8 p-7 sm:p-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <span className="badge badge-brand"><Sparkles size={13} />بكدجات ذكية</span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight" style={{ color: "var(--ink)" }}>حوّلي منتجاتك إلى عروض متكاملة تتكيف مع كل مقاس ولون.</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 muted">اختاري تيشيرت وجينز، وحددي المقاسات والألوان المتاحة، وسنحسب لك سعر كل توليفة قبل الخصم وبعده تلقائيًا.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/packages/new" className="btn btn-primary"><Plus size={17} />ابدئي الآن</Link>
                <Link href="/products" className="btn btn-outline">تصفحي المنتجات <ArrowUpRight size={15} /></Link>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { icon: Boxes, title: "اختاري المنتجات", text: "تيشيرت + جينز + أي عناصر إضافية." },
                { icon: Layers3, title: "ولّدي التوليفات", text: "كل لون ومقاس يصبح بكدجًا فرعيًا مستقلًا." },
                { icon: Tags, title: "الأسعار تلقائيًا", text: "السعر قبل الخصم والخصم والسعر النهائي." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="panel-muted flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--surface)", color: "var(--brand-strong)" }}><Icon size={18} /></span>
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>{title}</p>
                    <p className="mt-0.5 text-xs muted">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
