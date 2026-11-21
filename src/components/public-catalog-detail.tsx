import Link from "next/link";
import {
  BadgePercent,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Expand,
  Gift,
  Layers3,
  Package,
  Palette,
  Ruler,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import PublicSiteShell from "@/components/public-site-shell";
import ZoomableImage from "@/components/zoomable-image";
import type {
  CatalogPackageDetail,
  CatalogProduct,
  CatalogVariant,
} from "@/lib/catalog";
import { canonicalColorName, colorInk, colorSwatch } from "@/lib/colors";
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";

function priceStats(variants: CatalogVariant[]) {
  const prices = variants.map((variant) => Number(variant.price) || 0);
  const befores = variants.map((variant) => Number(variant.priceBeforeDiscount) || 0);
  return {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    topDiscount: variants.reduce(
      (best, variant, index) => Math.max(best, discountPercent(befores[index], prices[index])),
      0,
    ),
  };
}

function uniqueImages(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function imageIndex(images: string[], src?: string | null) {
  if (!src) return 0;
  const index = images.indexOf(src);
  return index >= 0 ? index : 0;
}

function Breadcrumb({ trail }: { trail: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="مسار التنقل" className="mobile-scroll mb-5 flex min-w-0 items-center gap-2 text-[11px] font-bold muted">
      {trail.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 shrink-0 items-center gap-2">
          {index > 0 && <span className="text-[10px] opacity-50">/</span>}
          {item.href ? (
            <Link href={item.href} className="inline-flex items-center gap-1 transition hover:text-[var(--brand-strong)] hover:underline">
              {index === 0 && <ChevronRight size={13} />}
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[60vw] truncate" style={{ color: "var(--ink)" }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function DetailImage({
  src,
  alt,
  icon: Icon,
  className = "h-full w-full",
  images,
  initialIndex,
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  icon: typeof Package;
  className?: string;
  images?: string[];
  initialIndex?: number;
  fit?: "cover" | "contain";
}) {
  if (src) {
    return (
      <ZoomableImage
        src={src}
        alt={alt}
        className={className}
        images={images}
        initialIndex={initialIndex}
        fit={fit}
      />
    );
  }
  return (
    <div
      className={`${className} grid place-items-center`}
      style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--lav-soft))" }}
    >
      <Icon size={44} style={{ color: "var(--brand-strong)" }} />
    </div>
  );
}

function PriceRange({ min, max }: { min: number; max: number }) {
  return (
    <span className={min === max ? "" : "block text-[1.35rem] leading-9 sm:text-[1.6rem]"}>
      {min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`}
    </span>
  );
}

export function PublicProductDetail({ product }: { product: CatalogProduct }) {
  const stats = priceStats(product.variants);
  const gallery = uniqueImages([product.image_url, ...product.variants.map((variant) => variant.imageUrl)]);
  const hero = gallery[0] ?? null;

  return (
    <PublicSiteShell section="product">
      <Breadcrumb
        trail={[
          { href: "/", label: "الرئيسية" },
          { href: "/catalog/products", label: "المنتجات" },
          { label: product.name },
        ]}
      />

      <section className="app-card overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[380px] lg:min-h-[430px]" style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))" }}>
            <DetailImage
              src={hero}
              alt={product.name}
              icon={Package}
              className="absolute inset-0 h-full w-full"
              images={gallery}
              initialIndex={0}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
              <span className="badge badge-lav shadow-sm"><Sparkles size={12} />منتج لونيفا</span>
              {stats.topDiscount > 0 && (
                <span className="badge badge-success shadow-sm"><BadgePercent size={12} />خصم حتى {formatNumber(stats.topDiscount)}%</span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="no-scrollbar absolute inset-x-0 bottom-0 flex justify-center gap-2 overflow-x-auto p-3">
                {gallery.map((image, imageIndex) => (
                  <ZoomableImage
                    key={`${image}-${imageIndex}`}
                    src={image}
                    alt={`${product.name} ${imageIndex + 1}`}
                    images={gallery}
                    initialIndex={imageIndex}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white/80 shadow-md"
                    showHint={false}
                  />
                ))}
              </div>
            )}
            {gallery.length > 0 && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#21151a]/55 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur-sm">
                اضغط للتكبير
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-muted"><Layers3 size={12} />{formatNumber(product.variants.length)} متغير</span>
              <span className="badge badge-brand"><ShieldCheck size={12} />تفاصيل واضحة</span>
            </div>
            <h1 className="page-title mt-4 break-words">{product.name}</h1>
            <p className="mono mt-2 text-[11px] font-bold tracking-wide" dir="ltr" style={{ color: "var(--muted-2)" }}>{product.primary_sku}</p>
            {product.description && <p className="mt-4 max-w-xl text-sm leading-8 muted">{product.description}</p>}

            <div className="mt-6 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--surface-2))", border: "1px solid var(--line)" }}>
              <p className="text-[10px] font-black tracking-widest" style={{ color: "var(--brand-strong)" }}>السعر النهائي</p>
              <p className="money mt-2 text-[1.8rem] leading-none sm:text-[2.2rem]" style={{ color: "var(--brand-strong)" }}>
                <PriceRange min={stats.min} max={stats.max} />
              </p>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-6 muted">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                الأسعار معروضة بعد الخصم، وتختلف حسب اللون والمقاس.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Palette size={16} className="mx-auto" style={{ color: "var(--lav-strong)" }} />
                <p className="mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(new Set(product.variants.map((variant) => variant.color).filter(Boolean)).size)}</p>
                <p className="text-[10px] muted">ألوان</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Ruler size={16} className="mx-auto" style={{ color: "var(--brand-strong)" }} />
                <p className="mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(new Set(product.variants.map((variant) => variant.size).filter(Boolean)).size)}</p>
                <p className="text-[10px] muted">مقاسات</p>
              </div>
              <div className="col-span-2 rounded-xl p-3 text-center sm:col-span-1" style={{ background: "var(--surface-2)" }}>
                <Tag size={16} className="mx-auto" style={{ color: "var(--success)" }} />
                <p className="mt-2 text-lg font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(stats.topDiscount)}%</p>
                <p className="text-[10px] muted">أعلى خصم</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="app-card mt-5 p-5 sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="eyebrow">الخيارات المتاحة</p>
            <h2 className="section-title mt-1">الألوان والمقاسات</h2>
            <p className="mt-1 text-xs muted">كل متغير بسعره النهائي وصورته الخاصة.</p>
          </div>
          <span className="badge badge-muted self-start sm:self-auto"><Layers3 size={12} />{formatNumber(product.variants.length)} متغير</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {product.variants.map((variant) => {
            const before = Number(variant.priceBeforeDiscount) || 0;
            const price = Number(variant.price) || 0;
            const percent = discountPercent(before, price);
            const swatch = colorSwatch(variant.color || "");
            return (
              <article
                key={variant.id}
                className="group min-w-0 overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none"
                style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}
              >
                <div className="relative h-28 overflow-hidden">
                  <DetailImage
                    src={variant.imageUrl}
                    alt={`${product.name} ${canonicalColorName(variant.color || "")} ${variant.size}`}
                    icon={Palette}
                    images={gallery}
                    initialIndex={imageIndex(gallery, variant.imageUrl)}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[#21151a]/55 px-2 py-0.5 text-[9px] font-black text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 motion-reduce:transition-none">
                    تكبير <Expand size={9} className="inline" />
                  </span>
                </div>
                <div className="min-w-0 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[10px] font-black"
                      style={{ background: swatch, color: colorInk(variant.color || "") }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-white/80" />
                      {canonicalColorName(variant.color || "") || "لون"}
                    </span>
                    <span className="badge badge-muted">مقاس {variant.size}</span>
                    {percent > 0 && <span className="badge badge-success">خصم {formatNumber(percent)}%</span>}
                    {variant.stock !== undefined && (
                      variant.stock === 0 ? (
                        <span className="badge badge-warning">نفد من المخزون</span>
                      ) : variant.stock <= 3 ? (
                        <span className="badge badge-warning">متبقي {variant.stock} قطع فقط!</span>
                      ) : (
                        <span className="badge badge-success">متوفر بالمخزون</span>
                      )
                    )}
                  </div>
                  <p className="mono mt-2 truncate text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{variant.sku}</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-2">
                    <span className="money text-sm font-black" style={{ color: "var(--brand-strong)" }}>{formatMoney(price)}</span>
                    {percent > 0 && <span className="money text-[10px] line-through muted-2">{formatMoney(before)}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </PublicSiteShell>
  );
}

export function PublicPackageDetail({ pkg }: { pkg: CatalogPackageDetail }) {
  const stats = priceStats(pkg.variants);
  const gallery = uniqueImages([
    pkg.image_url,
    ...pkg.variants.map((variant) => variant.imageUrl),
    ...pkg.items.map((item) => item.imageUrl),
  ]);
  const hero = gallery[0] ?? null;
  const before = Number(pkg.starting_before_price) || 0;
  const after = Number(pkg.starting_price) || 0;
  const savings = Math.max(0, before - after);

  return (
    <PublicSiteShell section="package">
      <Breadcrumb
        trail={[
          { href: "/", label: "الرئيسية" },
          { href: "/catalog/packages", label: "البكدجات" },
          { label: pkg.name },
        ]}
      />

      <section className="app-card overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[380px] lg:min-h-[430px]" style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--surface-3))" }}>
            <DetailImage
              src={hero}
              alt={pkg.name}
              icon={Gift}
              className="absolute inset-0 h-full w-full"
              images={gallery}
              initialIndex={0}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
              <span className="badge badge-brand shadow-sm"><Gift size={12} />بكدج لونيفا</span>
              {stats.topDiscount > 0 && (
                <span className="badge badge-success shadow-sm"><BadgePercent size={12} />خصم حتى {formatNumber(stats.topDiscount)}%</span>
              )}
            </div>
            {pkg.badge && (
              <span className="pointer-events-none absolute bottom-16 right-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold text-[#7c4354] shadow-sm backdrop-blur">
                {pkg.badge}
              </span>
            )}
            {gallery.length > 1 && (
              <div className="no-scrollbar absolute inset-x-0 bottom-0 flex justify-center gap-2 overflow-x-auto p-3">
                {gallery.map((image, imageIndex) => (
                  <ZoomableImage
                    key={`${image}-${imageIndex}`}
                    src={image}
                    alt={`${pkg.name} ${imageIndex + 1}`}
                    images={gallery}
                    initialIndex={imageIndex}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white/80 shadow-md"
                    showHint={false}
                  />
                ))}
              </div>
            )}
            {gallery.length > 0 && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#21151a]/55 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur-sm">
                اضغط للتكبير
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-brand"><Sparkles size={12} />توليفة جاهزة</span>
              <span className="badge badge-muted"><Boxes size={12} />{formatNumber(pkg.items_count)} منتجات</span>
              <span className="badge badge-lav"><Layers3 size={12} />{formatNumber(pkg.variants_count)} بكدج فرعي</span>
            </div>
            <h1 className="page-title mt-4 break-words">{pkg.name}</h1>
            <p className="mono mt-2 text-[11px] font-bold tracking-wide" dir="ltr" style={{ color: "var(--muted-2)" }}>{pkg.primary_sku}</p>
            {pkg.description && <p className="mt-4 max-w-xl text-sm leading-8 muted">{pkg.description}</p>}

            <div className="mt-6 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--surface-2))", border: "1px solid var(--line)" }}>
              <p className="text-[10px] font-black tracking-widest" style={{ color: "var(--brand-strong)" }}>السعر بعد الخصم</p>
              <p className="money mt-2 text-[1.8rem] leading-none sm:text-[2.2rem]" style={{ color: "var(--brand-strong)" }}>
                <PriceRange min={stats.min} max={stats.max} />
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                {savings > 0 && <span className="badge badge-success">توفير {formatMoney(savings)}</span>}
                {stats.topDiscount > 0 && <span className="badge badge-muted">خصم حتى {formatNumber(stats.topDiscount)}%</span>}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-6 muted">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                يبدأ السعر من {formatMoney(after)}، ويختلف حسب التوليفة والمقاس.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="app-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Boxes size={18} /></span>
            <div className="min-w-0">
              <h2 className="section-title">مكونات البكدج</h2>
              <p className="mt-0.5 text-[11px] muted-2">القطع الأساسية داخل كل توليفة.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg.items.map((item) => (
              <article key={item.id} className="group flex min-w-0 items-center gap-3 rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ background: "var(--surface)", color: "var(--lav-strong)" }}>
                  <DetailImage
                    src={item.imageUrl}
                    alt={item.productName}
                    icon={Package}
                    className="h-full w-full"
                    images={gallery}
                    initialIndex={imageIndex(gallery, item.imageUrl)}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#21151a]/55 py-0.5 text-center text-[8px] font-black text-white opacity-0 transition group-hover:opacity-100 motion-reduce:transition-none">تكبير</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black" style={{ color: "var(--ink)" }}>{item.productName}</p>
                  <p className="mono mt-0.5 truncate text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{item.primarySku}</p>
                  <span className="badge badge-muted mt-1.5">× {formatNumber(item.quantity)}</span>
                </div>
                <Link
                  href={`/catalog/products/${item.productId}`}
                  className="btn-icon shrink-0"
                  title={`تفاصيل ${item.productName}`}
                  aria-label={`تفاصيل ${item.productName}`}
                >
                  <ChevronRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="app-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Layers3 size={18} /></span>
            <div className="min-w-0">
              <h2 className="section-title">البكدجات الفرعية</h2>
              <p className="mt-0.5 text-[11px] muted-2">توليفات جاهزة بأسعارها بعد الخصم.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg.variants.map((variant) => {
              const variantBefore = Number(variant.priceBeforeDiscount) || 0;
              const variantPrice = Number(variant.price) || 0;
              const percent = discountPercent(variantBefore, variantPrice);
              return (
                <article key={variant.id} className="group min-w-0 overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
                  <div className="relative h-24 overflow-hidden">
                    <DetailImage
                      src={variant.imageUrl}
                      alt={variant.name || pkg.name}
                      icon={Gift}
                      images={gallery}
                      initialIndex={imageIndex(gallery, variant.imageUrl)}
                    />
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[#21151a]/55 px-2 py-0.5 text-[9px] font-black text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 motion-reduce:transition-none">
                      تكبير <Expand size={9} className="inline" />
                    </span>
                  </div>
                  <div className="min-w-0 p-3">
                    <p className="truncate text-[12px] font-black" style={{ color: "var(--ink)" }}>{variant.name || pkg.name}</p>
                    <p className="mono mt-1 truncate text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{variant.sku}</p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="money text-sm font-black" style={{ color: "var(--brand-strong)" }}>{formatMoney(variantPrice)}</span>
                      {percent > 0 && <span className="money text-[10px] line-through muted-2">{formatMoney(variantBefore)}</span>}
                      {percent > 0 && <span className="badge badge-success">خصم {formatNumber(percent)}%</span>}
                      {variant.stock !== undefined && (
                        variant.stock > 0 ? (
                          <span className="badge badge-success">متاح {formatNumber(variant.stock)} بكدج</span>
                        ) : (
                          <span className="badge badge-warning">نفد من المخزون</span>
                        )
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </PublicSiteShell>
  );
}
