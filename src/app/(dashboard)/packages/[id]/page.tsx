import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Gift,
  Layers3,
  Pencil,
  ReceiptText,
  Sparkles,
  Tag,
  Warehouse,
} from "lucide-react";
import DeleteButton from "@/components/delete-button";
import PackageVariants, { type PackageVariantView } from "@/components/package-variants";
import { getPackageDetail } from "@/lib/package-queries";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { discountPercent, packageStatusLabels, type PackageStatus } from "@/lib/packages";

const statusStyle: Record<PackageStatus, string> = {
  active: "badge-success",
  draft: "badge-warning",
  archived: "badge-muted",
};

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = await getPackageDetail(id);
  if (!pkg) notFound();

  const variants = (pkg.variants ?? []) as PackageVariantView[];
  const items = (pkg.items ?? []) as Array<{
    id: string;
    product_id: string;
    product_name: string;
    primary_sku: string;
    image_url: string | null;
    quantity: number;
    variant_count: number;
  }>;

  const baseBefore = Number(pkg.price_before_discount || 0);
  const baseAfter = Number(pkg.price_after_discount || 0);
  const savings = Math.max(0, baseBefore - baseAfter);
  const percent = discountPercent(baseBefore, baseAfter);
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const minPrice = variants.length ? Math.min(...variants.map((variant) => Number(variant.price_after_discount))) : baseAfter;
  const maxPrice = variants.length ? Math.max(...variants.map((variant) => Number(variant.price_after_discount))) : baseAfter;

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Link href="/packages" className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
          <ChevronRight size={16} />كل البكدجات
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/invoices/new?package=${id}`} className="btn btn-primary"><ReceiptText size={16} />إصدار فاتورة</Link>
          <Link href={`/packages/${id}/edit`} className="btn btn-soft"><Pencil size={16} />تعديل البكدج</Link>
          <DeleteButton endpoint={`/api/packages/${id}`} returnTo="/packages" label="البكدج" />
        </div>
      </div>

      <section className="app-card overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div className="relative min-h-64 overflow-hidden sm:min-h-80" style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--surface-3))" }}>
            {pkg.image_url ? (
              <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full min-h-64 place-items-center">
                <div className="text-center">
                  <Gift size={52} className="mx-auto" style={{ color: "var(--brand)" }} />
                  <p className="mt-3 text-sm font-extrabold" style={{ color: "var(--brand-strong)" }}>عرض لونيفا</p>
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
              <span className={`badge ${statusStyle[(pkg.status as PackageStatus) ?? "active"]}`}>{packageStatusLabels[(pkg.status as PackageStatus) ?? "active"]}</span>
              {percent > 0 && <span className="badge badge-dark backdrop-blur-sm">خصم {formatNumber(percent)}%</span>}
            </div>
            {pkg.badge && <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#7c4354] shadow-sm backdrop-blur">{pkg.badge}</span>}
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-brand"><Sparkles size={12} />بكدج مجمّع</span>
              <span className="badge badge-muted"><CalendarDays size={12} />{formatDate(pkg.created_at)}</span>
            </div>
            <h1 className="page-title mt-4">{pkg.name}</h1>
            <p className="mono mt-2 text-xs font-bold tracking-wide" dir="ltr" style={{ color: "var(--muted-2)" }}>{pkg.primary_sku}</p>
            {pkg.description && <p className="mt-4 max-w-xl text-sm leading-7 muted">{pkg.description}</p>}

            <div className="mt-6 rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <p className="text-[10px] font-bold muted-2">يبدأ العرض من</p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <p className="money text-3xl" style={{ color: "var(--brand-strong)" }}>{formatMoney(minPrice)}</p>
                {savings > 0 && <p className="pb-1 text-sm line-through muted-2">{formatMoney(baseBefore)}</p>}
                {savings > 0 && <span className="badge badge-success mb-1">توفير {formatMoney(savings)}</span>}
              </div>
              {variants.length > 1 && <p className="mt-2 text-[11px] muted">تتراوح الأسعار بين {formatMoney(minPrice)} و{formatMoney(maxPrice)} حسب التوليفة.</p>}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Boxes size={16} className="mx-auto" style={{ color: "var(--lav-strong)" }} />
                <p className="mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(items.length)}</p>
                <p className="text-[10px] muted">منتجات</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Layers3 size={16} className="mx-auto" style={{ color: "var(--brand-strong)" }} />
                <p className="mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(variants.length)}</p>
                <p className="text-[10px] muted">بكدج فرعي</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Warehouse size={16} className="mx-auto" style={{ color: "var(--success)" }} />
                <p className="mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(stock)}</p>
                <p className="text-[10px] muted">مخزون</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="app-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Boxes size={19} /></span>
            <div>
              <h2 className="section-title">مكونات البكدج</h2>
              <p className="mt-0.5 text-xs muted">القطع الأساسية التي تدخل في كل بكدج فرعي.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: "var(--surface)", color: "var(--lav-strong)" }}>
                  {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <Boxes size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{item.product_name}</p>
                  <p className="mono mt-0.5 text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{item.primary_sku}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="badge badge-muted">× {formatNumber(item.quantity)}</span>
                    <span className="badge badge-lav">{formatNumber(item.variant_count)} متغير</span>
                  </div>
                </div>
                <Link href={`/products/${item.product_id}`} className="btn-icon shrink-0" title="فتح المنتج" aria-label="فتح المنتج"><ArrowLeft size={16} /></Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="app-card p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold" style={{ color: "var(--ink)" }}><CircleDollarSign size={16} style={{ color: "var(--brand-strong)" }} />ملخص التسعير</p>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between"><span className="muted">السعر قبل الخصم</span><b style={{ color: "var(--ink)" }}>{formatMoney(baseBefore)}</b></div>
              <div className="flex items-center justify-between"><span className="muted">السعر بعد الخصم</span><b style={{ color: "var(--brand-strong)" }}>{formatMoney(baseAfter)}</b></div>
              <div className="flex items-center justify-between"><span className="muted">قيمة التوفير</span><b style={{ color: "var(--success)" }}>{formatMoney(savings)}</b></div>
              <div className="flex items-center justify-between"><span className="muted">نسبة الخصم</span><span className="badge badge-success">{formatNumber(percent)}%</span></div>
              <div className="divider" />
              <div className="flex items-center justify-between"><span className="muted">الحالة</span><span className={`badge ${statusStyle[(pkg.status as PackageStatus) ?? "active"]}`}>{packageStatusLabels[(pkg.status as PackageStatus) ?? "active"]}</span></div>
              <div className="flex items-center justify-between"><span className="muted">آخر تحديث</span><b style={{ color: "var(--ink)" }}>{formatDate(pkg.updated_at)}</b></div>
            </div>
          </section>

          <section className="app-card p-5" style={{ background: "linear-gradient(150deg, var(--surface), var(--brand-soft))" }}>
            <Tag size={18} style={{ color: "var(--brand-strong)" }} />
            <p className="mt-3 text-sm font-extrabold" style={{ color: "var(--ink)" }}>كل بكدج فرعي مستقل</p>
            <p className="mt-1 text-xs leading-6 muted">يمكنك تعديل صورة ومخزون وسعر كل توليفة دون التأثير على باقي البكدجات.</p>
            <Link href={`/packages/${id}/edit`} className="btn btn-primary mt-4 w-full"><Pencil size={15} />فتح المحرر</Link>
          </section>
        </aside>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">المتغيرات</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>البكدجات الفرعية</h2>
            <p className="mt-1 text-xs muted">كل توليفة لون ومقاس بسعرها ومخزونها وصورتها — افتحي التفاصيل لرؤية المكونات كاملة.</p>
          </div>
          <span className="badge badge-brand self-start sm:self-auto"><Layers3 size={12} />{formatNumber(variants.length)} توليفة</span>
        </div>

        <PackageVariants variants={variants} packageId={id} />
      </section>
    </>
  );
}
