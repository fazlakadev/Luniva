import Link from "next/link";
import {
  ArrowUpLeft,
  BadgePercent,
  Boxes,
  Gift,
  Layers3,
  Package,
  Palette,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import PublicSiteShell from "@/components/public-site-shell";
import { loadPublicCatalog, type CatalogVariant } from "@/lib/catalog";
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";

type PublicCatalogProps = {
  page?: "home" | "products" | "packages";
};

function priceStats(variants: CatalogVariant[]) {
  const prices = variants.map((variant) => Number(variant.price) || 0);
  const befores = variants.map((variant) => Number(variant.priceBeforeDiscount) || 0);
  const topDiscount = variants.reduce(
    (best, variant, index) =>
      Math.max(best, discountPercent(befores[index], prices[index])),
    0,
  );
  return {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    topDiscount,
  };
}

function CardImage({
  src,
  alt,
  icon: Icon,
}: {
  src: string | null;
  alt: string;
  icon: typeof Gift;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
    );
  }
  return (
    <div className="grid h-full w-full place-items-center" style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--lav-soft))" }}>
      <Icon size={40} style={{ color: "var(--brand-strong)" }} />
    </div>
  );
}

export default async function PublicCatalog({ page = "home" }: PublicCatalogProps) {
  const { products, packages, loadError } = await loadPublicCatalog();
  const offerCount = packages.filter((item) => priceStats(item.variants).topDiscount > 0).length;

  const isHome = page === "home";
  const isProducts = page === "products";
  const isPackages = page === "packages";

  const heroHref = isProducts ? "/catalog/packages" : "/catalog/products";
  const heroLabel = isProducts ? "تصفّح البكدجات" : "تصفّح المنتجات";
  const heroTitleTop = isHome ? "كل تشكيلة لونيفا" : isProducts ? "كل المنتجات" : "بكدجات لونيفا";
  const heroTitleBottom = isHome ? "بروح مصرية" : isProducts ? "بالتفاصيل الكاملة" : "بأسعار بعد الخصم";
  const HeroIcon = isPackages ? Gift : Package;

  const heroText = isHome
    ? "اكتشفي تشكيلة تجمع القطع اليومية والبكدجات المُنسّقة في صفحة واحدة، بألوان ومقاسات واضحة وأسعار نهائية، لتجدي ما يناسب ذوقك بثقة وسهولة."
    : isProducts
      ? "تصفّحي كل منتجات لونيفا في صفحة واحدة: الألوان والمقاسات والصور والسعر النهائي لكل متغير، وكل التفاصيل التي تساعدك على المقارنة قبل الطلب."
      : "توليفات جاهزة تجمع أكثر من قطعة في بكدج واحد بسعر بعد الخصم. افتحي كل بكدج لتري مكوناته والبكدجات الفرعية المتاحة له.";

  return (
    <PublicSiteShell section={page}>
      <section
        className="page-enter relative overflow-hidden rounded-[1.75rem] border px-5 py-10 sm:rounded-[2.25rem] sm:px-10 sm:py-14"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{ background: "var(--lav-soft)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{ background: "var(--brand-soft)" }}
        />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <span className="badge badge-brand"><Sparkles size={13} />لونيفا · تأسست عام 2026</span>
            <h1 className="page-title mt-5 break-words leading-[1.18] sm:text-[3rem]">
              {heroTitleTop}
              <span className="mt-1 block" style={{ color: "var(--brand-strong)" }}>{heroTitleBottom}</span>
            </h1>
            <p className="page-subtitle mt-4 max-w-xl text-sm leading-9 sm:text-base">
              {heroText}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="badge badge-lav"><Package size={12} />{formatNumber(products.length)} منتج</span>
              <span className="badge badge-brand"><Gift size={12} />{formatNumber(packages.length)} بكدج</span>
              <span className="badge badge-success"><BadgePercent size={12} />{formatNumber(offerCount)} بكدج بخصم</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href={heroHref} className="btn btn-primary px-4 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm">
                <HeroIcon size={16} />{heroLabel}
              </Link>
              <Link href="/about" className="btn btn-outline px-4 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm">
                <Sparkles size={16} />قصتنا
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[20rem] lg:block">
            <div
              className="absolute inset-0 rounded-[2rem] border"
              style={{ borderColor: "var(--line)", background: "linear-gradient(145deg, var(--brand-soft), var(--lav-soft))" }}
            />
            <div
              className="absolute inset-5 grid place-items-center overflow-hidden rounded-[1.6rem]"
              style={{ background: "color-mix(in srgb, var(--surface) 82%, transparent)", border: "1px solid var(--line)" }}
            >
              <span className="text-center">
                <Sparkles size={64} className="mx-auto" style={{ color: "var(--brand)" }} />
                <span className="mt-4 block text-sm font-black" style={{ color: "var(--brand-strong)" }}>لونيفا</span>
              </span>
            </div>
            <div
              className="absolute -bottom-3 right-5 rounded-2xl border px-4 py-3 shadow-lg"
              style={{ borderColor: "var(--line)", background: "var(--surface)" }}
            >
              <p className="text-[10px] font-bold muted-2">تشكيلة اليوم</p>
              <p className="mt-1 text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                {formatNumber(products.length)} منتج · {formatNumber(packages.length)} بكدج
              </p>
            </div>
            <div
              className="absolute -top-3 left-5 rounded-2xl border px-4 py-3 shadow-lg"
              style={{ borderColor: "var(--line)", background: "var(--surface)" }}
            >
              <p className="text-[10px] font-bold muted-2">شركة ملابس نسائية مصرية</p>
              <p className="mt-1 text-sm font-extrabold" style={{ color: "var(--brand-strong)" }}>تأسست عام 2026</p>
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="app-card mt-6 p-5 text-sm font-bold" style={{ color: "var(--danger)" }}>
          تعذّر تحميل الكتالوج حاليًا. حاولي مرة أخرى بعد قليل.
        </div>
      )}

      {!isPackages && (
      <section id="products" className="mt-12 scroll-mt-28 sm:mt-16">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">تشكيلة لونيفا</p>
            <h2 className="section-title mt-1">المنتجات</h2>
            <p className="mt-1 text-xs muted">اختاري اللون والمقاس، واعرفي السعر النهائي والتفاصيل قبل الطلب.</p>
          </div>
          <span className="badge badge-muted self-start sm:self-auto"><Layers3 size={12} />{formatNumber(products.length)} منتج</span>
        </div>

        {products.length === 0 ? (
          <div className="app-card empty-state">
            <div>
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                <Package size={28} />
              </span>
              <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد منتجات للعرض بعد</p>
              <p className="mx-auto mt-2 max-w-xs text-sm muted">ستظهر المنتجات هنا فور إضافتها إلى الكتالوج.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const stats = priceStats(product.variants);
              const hero = product.image_url || product.variants.find((variant) => variant.imageUrl)?.imageUrl || null;
              return (
                <Link
                  key={product.id}
                  href={`/catalog/products/${product.id}`}
                  className="group block overflow-hidden rounded-[1.5rem] transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]"
                  style={{ border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}
                  aria-label={`عرض تفاصيل ${product.name}`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <CardImage src={hero} alt={product.name} icon={Package} />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                      <span className="badge badge-lav shadow-sm"><Sparkles size={12} />منتج</span>
                      {stats.topDiscount > 0 && (
                        <span className="badge badge-success shadow-sm"><BadgePercent size={12} />خصم {formatNumber(stats.topDiscount)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 p-4">
                    <h3 className="truncate text-base font-extrabold" style={{ color: "var(--ink)" }}>{product.name}</h3>
                    <p className="mono mt-1 text-[11px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{product.primary_sku}</p>
                    {product.description && <p className="mt-2 line-clamp-2 text-xs leading-6 muted">{product.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="badge badge-muted"><Layers3 size={12} />{formatNumber(product.variants.length)} متغير</span>
                      {product.variants.slice(0, 3).map((variant) => (
                        <span key={variant.id} className="badge badge-muted">
                          <Palette size={11} />{variant.color} · {variant.size}
                        </span>
                      ))}
                      {product.variants.length > 3 && <span className="badge badge-muted">+{formatNumber(product.variants.length - 3)}</span>}
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold muted-2">السعر النهائي</p>
                        <p className="money mt-1 truncate text-lg" style={{ color: "var(--brand-strong)" }}>
                          {stats.min === stats.max ? formatMoney(stats.min) : `${formatMoney(stats.min)} – ${formatMoney(stats.max)}`}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
                        التفاصيل <ArrowUpLeft size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      )}

      {!isProducts && (
      <section id="packages" className="mt-12 scroll-mt-28 sm:mt-16">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">عروض لونيفا</p>
            <h2 className="section-title mt-1">البكدجات</h2>
            <p className="mt-1 text-xs muted">توليفات جاهزة تجمع أكثر من منتج بسعر واحد بعد الخصم.</p>
          </div>
          <span className="badge badge-muted self-start sm:self-auto"><Gift size={12} />{formatNumber(packages.length)} بكدج</span>
        </div>

        {packages.length === 0 ? (
          <div className="app-card empty-state">
            <div>
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                <Gift size={28} />
              </span>
              <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد بكدجات للعرض بعد</p>
              <p className="mx-auto mt-2 max-w-xs text-sm muted">ستظهر البكدجات النشطة هنا فور تجهيزها.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((item) => {
              const stats = priceStats(item.variants);
              const hero = item.image_url || item.variants.find((variant) => variant.imageUrl)?.imageUrl || null;
              return (
                <Link
                  key={item.id}
                  href={`/catalog/packages/${item.id}`}
                  className="group block overflow-hidden rounded-[1.5rem] transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]"
                  style={{ border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}
                  aria-label={`عرض تفاصيل ${item.name}`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <CardImage src={hero} alt={item.name} icon={Gift} />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                      <span className="badge badge-brand shadow-sm"><Gift size={12} />بكدج</span>
                      {stats.topDiscount > 0 && (
                        <span className="badge badge-success shadow-sm">خصم {formatNumber(stats.topDiscount)}%</span>
                      )}
                    </div>
                    {item.badge && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-[#7c4354] shadow-sm backdrop-blur">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 p-4">
                    <h3 className="truncate text-base font-extrabold" style={{ color: "var(--ink)" }}>{item.name}</h3>
                    <p className="mono mt-1 text-[11px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{item.primary_sku}</p>
                    {item.description && <p className="mt-2 line-clamp-2 text-xs leading-6 muted">{item.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="badge badge-muted"><Boxes size={12} />{formatNumber(item.items_count)} منتجات</span>
                      <span className="badge badge-lav"><Layers3 size={12} />{formatNumber(item.variants_count)} بكدج فرعي</span>
                      <span className="badge badge-muted"><Tag size={12} />يبدأ من {formatMoney(item.starting_price)}</span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold muted-2">السعر بعد الخصم</p>
                        <p className="money mt-1 truncate text-lg" style={{ color: "var(--brand-strong)" }}>
                          {stats.min === stats.max ? formatMoney(stats.min) : `${formatMoney(stats.min)} – ${formatMoney(stats.max)}`}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
                        التفاصيل <ArrowUpLeft size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      )}
    </PublicSiteShell>
  );
}
