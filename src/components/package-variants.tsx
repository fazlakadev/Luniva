"use client";

import Link from "next/link";
import {
  Check,
  Eye,
  Layers3,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { colorInk, colorSwatch, canonicalColorName, normalizeColorName } from "@/lib/colors";
import ZoomableImage from "@/components/zoomable-image";
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";

export type PackageSelection = {
  productId: string;
  productName: string;
  variantId: string;
  color: string;
  size: string;
  sku: string;
  quantity: number;
  unitPrice: string | number;
  imageUrl: string | null;
};

export type PackageVariantView = {
  id: string;
  name: string;
  sku: string;
  price_before_discount: string | number;
  price_after_discount: string | number;
  image_url: string | null;
  stock: number;
  is_default: boolean;
  selections: PackageSelection[];
};

function variantNumbers(variant: PackageVariantView) {
  const before = Number(variant.price_before_discount || 0);
  const after = Number(variant.price_after_discount || 0);
  const saving = Math.max(0, before - after);
  return { before, after, saving, percent: discountPercent(before, after), hasDiscount: saving > 0 };
}

/** The colours and sizes a package variant carries, taken from its product selections. */
function variantColors(variant: PackageVariantView) {
  return Array.from(
    new Set(variant.selections.map((selection) => canonicalColorName(selection.color)).filter(Boolean)),
  );
}

function variantSizes(variant: PackageVariantView) {
  return Array.from(new Set(variant.selections.map((selection) => selection.size).filter(Boolean)));
}

/** "اخضر / 213" reads as "أخضر / 213" so the card matches the colour chips. */
function variantTitle(variant: PackageVariantView) {
  return variant.name
    .split("/")
    .map((part) => canonicalColorName(part.trim()))
    .join(" / ");
}

function variantGallery(variant: PackageVariantView) {
  return Array.from(
    new Set(
      [variant.image_url, ...variant.selections.map((selection) => selection.imageUrl)].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );
}

function CompositionRow({ selection, compact = false }: { selection: PackageSelection; compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl ${compact ? "px-2 py-1.5" : "p-2.5"}`}
      style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
    >
      <span
        className={`shrink-0 overflow-hidden rounded-lg ${compact ? "h-8 w-8" : "h-11 w-11"}`}
        style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))", border: "1px solid var(--line)" }}
      >
        <ZoomableImage
          src={selection.imageUrl}
          alt={selection.productName}
          className="h-full w-full"
          showHint={false}
          placeholder={
            <span className="grid h-full w-full place-items-center">
              <span
                className={`rounded-full ${compact ? "h-4 w-4" : "h-6 w-6"}`}
                style={{ background: colorSwatch(selection.color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }}
              />
            </span>
          }
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-extrabold ${compact ? "text-[11px]" : "text-xs"}`} style={{ color: "var(--ink)" }}>
          {selection.productName}
        </p>
        <p className={`mt-0.5 flex items-center gap-1.5 ${compact ? "text-[9px]" : "text-[10px]"}`} style={{ color: "var(--muted-2)" }}>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: colorSwatch(selection.color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }}
          />
          {canonicalColorName(selection.color)} · {selection.size}
          <span className="mono truncate" dir="ltr">· {selection.sku}</span>
        </p>
      </div>
      <span className={`badge badge-lav shrink-0 ${compact ? "text-[9px]" : ""}`}>× {formatNumber(selection.quantity)}</span>
    </div>
  );
}

export default function PackageVariants({
  variants,
  packageId,
}: {
  variants: PackageVariantView[];
  packageId: string;
}) {
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "stock">("default");
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = variants.find((variant) => variant.id === activeId) ?? null;
  const activeGallery = active ? variantGallery(active) : [];

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [active]);

  const visible = useMemo(() => {
    // Arabic spellings differ (أخضر / اخضر), so compare folded text instead of the raw string.
    const query = normalizeColorName(search);
    const filtered = variants.filter((variant) => {
      if (colorFilter && !variantColors(variant).includes(colorFilter)) return false;
      if (!query) return true;
      const haystack = normalizeColorName(
        [
          variant.name,
          variant.sku,
          ...variant.selections.flatMap((selection) => [
            selection.productName,
            selection.color,
            selection.size,
            selection.sku,
          ]),
        ].join(" "),
      );
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => Number(a.price_after_discount) - Number(b.price_after_discount));
    if (sort === "price-desc") sorted.sort((a, b) => Number(b.price_after_discount) - Number(a.price_after_discount));
    if (sort === "stock") sorted.sort((a, b) => Number(b.stock) - Number(a.stock));
    return sorted;
  }, [colorFilter, search, sort, variants]);

  const colorGroups = useMemo(() => {
    const groups = new Map<
      string,
      { color: string; count: number; min: number; max: number; sizes: Set<string> }
    >();
    for (const variant of variants) {
      const numbers = variantNumbers(variant);
      const names = variantColors(variant);
      for (const color of names) {
        const entry =
          groups.get(color) ?? { color, count: 0, min: numbers.after, max: numbers.after, sizes: new Set<string>() };
        entry.count += 1;
        entry.min = Math.min(entry.min, numbers.after);
        entry.max = Math.max(entry.max, numbers.after);
        for (const selection of variant.selections) {
          if (canonicalColorName(selection.color) === color && selection.size) entry.sizes.add(selection.size);
        }
        groups.set(color, entry);
      }
    }
    return Array.from(groups.values());
  }, [variants]);

  if (variants.length === 0) {
    return (
      <div className="app-card empty-state">
        <div>
          <Layers3 size={34} className="mx-auto mb-3" style={{ color: "var(--muted-2)" }} />
          <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد بكدجات فرعية بعد</p>
          <p className="mt-1 text-sm muted">افتحي المحرر وولّدي التوليفات من ألوان ومقاسات المنتجات.</p>
          <Link href={`/packages/${packageId}/edit`} className="btn btn-primary mt-4"><Layers3 size={15} />إضافة بكدجات فرعية</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <Search size={16} style={{ color: "var(--muted-2)" }} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحثي باسم التوليفة أو الكود أو اللون"
            className="w-full min-w-0 bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="field py-2 text-xs sm:w-44"
            aria-label="ترتيب التوليفات"
          >
            <option value="default">الترتيب الافتراضي</option>
            <option value="price-asc">الأقل سعرًا أولًا</option>
            <option value="price-desc">الأعلى سعرًا أولًا</option>
            <option value="stock">الأكثر مخزونًا</option>
          </select>
          <span className="badge badge-brand shrink-0">{formatNumber(visible.length)} / {formatNumber(variants.length)}</span>
        </div>
      </div>

      {colorGroups.length > 0 && (
        <div className="mb-4 rounded-2xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[11px] font-extrabold" style={{ color: "var(--ink-soft)" }}>
              <Layers3 size={13} style={{ color: "var(--lav-strong)" }} />
              توزيع التوليفات حسب اللون
            </p>
            {(search || colorFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setColorFilter(null);
                }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                style={{ color: "var(--brand-strong)", background: "var(--surface)" }}
              >
                <X size={11} />مسح الفلتر
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {colorGroups.map((group) => {
              const hex = colorSwatch(group.color);
              const ink = colorInk(group.color);
              const active = colorFilter === group.color;
              const shown = active ? visible.length : group.count;
              return (
                <button
                  key={group.color}
                  type="button"
                  onClick={() => setColorFilter(active ? null : group.color)}
                  className="flex items-center gap-2.5 rounded-xl p-2.5 text-right transition hover:-translate-y-0.5"
                  style={{
                    background: "var(--surface)",
                    border: active ? `1.5px solid ${hex}` : "1px solid var(--line)",
                    boxShadow: active ? `0 8px 20px ${hex}33` : "none",
                  }}
                  aria-pressed={active}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: hex, color: ink }}>
                    <Layers3 size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-xs" style={{ color: "var(--ink)" }}>{group.color}</b>
                      <span className={`badge shrink-0 ${active ? "badge-brand" : "badge-muted"}`}>{formatNumber(shown)} توليفة</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px]" style={{ color: "var(--muted-2)" }}>
                      <span className="money font-extrabold" style={{ color: "var(--brand-strong)" }}>{formatMoney(group.min)}</span>
                      {group.max > group.min && <span>– {formatMoney(group.max)}</span>}
                      <span>·</span>
                      {Array.from(group.sizes).slice(0, 4).map((size) => (
                        <span key={size} className="rounded-full px-1.5 py-0.5 font-bold" style={{ background: "var(--surface-3)", color: "var(--ink-soft)" }}>
                          {size}
                        </span>
                      ))}
                      {group.sizes.size > 4 && <span>+{formatNumber(group.sizes.size - 4)}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(search || colorFilter) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>النتائج حسب:</span>
          {colorFilter && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
              style={{ background: colorSwatch(colorFilter), color: colorInk(colorFilter) }}
            >
              {colorFilter}
            </span>
          )}
          {search && <span className="badge badge-brand">{search}</span>}
          <span className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>
            {formatNumber(visible.length)} من {formatNumber(variants.length)}
          </span>
        </div>
      )}

      {visible.length === 0 && (
        <div className="app-card empty-state">
          <div>
            <Search size={30} className="mx-auto mb-3" style={{ color: "var(--muted-2)" }} />
            <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد توليفة مطابقة</p>
            <p className="mt-1 text-sm muted">جرّبي لونًا آخر أو امسحي كلمة البحث.</p>
            <button
              type="button"
              className="btn btn-ghost mt-4"
              onClick={() => {
                setSearch("");
                setColorFilter(null);
              }}
            >
              <X size={14} />مسح الفلاتر
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((variant) => {
          const numbers = variantNumbers(variant);
          const gallery = variantGallery(variant);
          return (
            <article key={variant.id} className="app-card group flex flex-col overflow-hidden transition hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="relative h-44 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))" }}>
                <ZoomableImage
                  src={variant.image_url}
                  alt={variantTitle(variant)}
                  images={gallery}
                  initialIndex={0}
                  className="h-full w-full"
                  placeholder={
                    <div className="grid h-full place-items-center">
                      <div className="text-center">
                        <Layers3 size={34} style={{ color: "var(--lav-strong)" }} />
                        <p className="mt-2 text-[10px] font-extrabold" style={{ color: "var(--lav-strong)" }}>بكدج لونيفا</p>
                      </div>
                    </div>
                  }
                />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                  {variant.is_default ? <span className="badge badge-dark">الافتراضي</span> : <span />}
                  <div className="flex flex-col items-end gap-1">
                    {numbers.hasDiscount && <span className="badge badge-success">-{formatNumber(numbers.percent)}%</span>}
                    <span className={`badge ${variant.stock > 0 ? "badge-dark" : "badge-warning"}`}>
                      <Warehouse size={11} />{variant.stock > 0 ? formatNumber(variant.stock) : "نفد المخزون"}
                    </span>
                  </div>
                </div>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/45 py-2 text-[10px] font-extrabold text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                  <Eye size={13} />عرض التفاصيل
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{variantTitle(variant)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {variantColors(variant).map((color) => (
                        <span
                          key={color}
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold"
                          style={{ background: "var(--surface-2)", color: "var(--ink-soft)", border: "1px solid var(--line)" }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: colorSwatch(color), boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }} />
                          {color}
                        </span>
                      ))}
                      {variantSizes(variant).map((size) => (
                        <span key={size} className="badge badge-muted text-[9px]">مقاس {size}</span>
                      ))}
                    </div>
                    <p className="mono mt-1 truncate text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{variant.sku}</p>
                  </div>
                  <span className="badge badge-lav shrink-0"><Package size={11} />{formatNumber(variant.selections.length)} قطع</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {variant.selections.slice(0, 2).map((selection) => (
                    <CompositionRow key={selection.variantId} selection={selection} compact />
                  ))}
                  {variant.selections.length > 2 && (
                    <p className="px-1 text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>
                      + {formatNumber(variant.selections.length - 2)} قطع أخرى داخل التوليفة
                    </p>
                  )}
                </div>

                <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--line)" }}>
                  <div>
                    <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>السعر النهائي</p>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                      <span className="money text-lg" style={{ color: "var(--brand-strong)" }}>{formatMoney(numbers.after)}</span>
                      {numbers.hasDiscount && <span className="text-[11px] line-through" style={{ color: "var(--muted-2)" }}>{formatMoney(numbers.before)}</span>}
                    </div>
                    {numbers.hasDiscount && <p className="text-[10px] font-extrabold" style={{ color: "var(--success)" }}>توفير {formatMoney(numbers.saving)}</p>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setActiveId(variant.id)} className="btn btn-outline px-2 py-2 text-[11px]">
                    <Eye size={14} />التفاصيل
                  </button>
                  <Link href={`/invoices/new?packageVariant=${variant.id}`} className="btn btn-primary px-2 py-2 text-[11px]">
                    <ReceiptText size={14} />بيع
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="app-card empty-state">
          <div>
            <Search size={32} className="mx-auto mb-3" style={{ color: "var(--muted-2)" }} />
            <p className="font-extrabold" style={{ color: "var(--ink)" }}>لا توجد توليفة مطابقة</p>
            <p className="mt-1 text-sm muted">جرّبي كلمة بحث أخرى أو امسحي الفلاتر.</p>
            <button type="button" onClick={() => setSearch("")} className="btn btn-soft mt-4">مسح البحث</button>
          </div>
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل ${variantTitle(active)}`}
          onClick={() => setActiveId(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:rounded-3xl"
            data-lenis-prevent
            data-lenis-prevent-wheel
            style={{ border: "1px solid var(--line)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative">
              <div className="relative h-52 overflow-hidden sm:h-60" style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))" }}>
                <ZoomableImage
                  src={active.image_url}
                  alt={variantTitle(active)}
                  images={activeGallery}
                  initialIndex={0}
                  className="h-full w-full"
                  placeholder={<div className="grid h-full place-items-center"><GiftMark /></div>}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent p-3 pt-8">
                  {active.is_default && <span className="badge badge-dark">الافتراضي</span>}
                  {variantColors(active).map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                      style={{ background: colorSwatch(color), color: colorInk(color) }}
                    >
                      {color}
                    </span>
                  ))}
                  <span className={`badge ${active.stock > 0 ? "badge-dark" : "badge-warning"}`}>
                    <Warehouse size={11} />{active.stock > 0 ? `مخزون ${formatNumber(active.stock)}` : "نفد المخزون"}
                  </span>
                  {variantNumbers(active).hasDiscount && (
                    <span className="badge badge-success">خصم {formatNumber(variantNumbers(active).percent)}%</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#4a3b42] shadow-md transition hover:bg-white"
                  aria-label="إغلاق"
                >
                  <X size={17} />
                </button>
              </div>
              {activeGallery.length > 1 && (
                <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto p-3" style={{ background: "var(--surface-2)" }}>
                  {activeGallery.map((image, index) => (
                    <ZoomableImage
                      key={`${image}-${index}`}
                      src={image}
                      alt={`${variantTitle(active)} ${index + 1}`}
                      images={activeGallery}
                      initialIndex={index}
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white/80 shadow-sm"
                      showHint={false}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-[0.16em]" style={{ color: "var(--brand)" }}>متغير البكدج</p>
                  <h3 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{variantTitle(active)}</h3>
                  <p className="mono mt-1 text-[11px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{active.sku}</p>
                </div>
                <div className="text-left">
                  <div className="flex items-baseline gap-2">
                    <span className="money text-2xl" style={{ color: "var(--brand-strong)" }}>{formatMoney(variantNumbers(active).after)}</span>
                    {variantNumbers(active).hasDiscount && (
                      <span className="text-sm line-through" style={{ color: "var(--muted-2)" }}>{formatMoney(variantNumbers(active).before)}</span>
                    )}
                  </div>
                  {variantNumbers(active).hasDiscount && (
                    <p className="mt-1 text-[11px] font-extrabold" style={{ color: "var(--success)" }}>
                      توفير {formatMoney(variantNumbers(active).saving)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><Package size={18} /></span>
                <div>
                  <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>مكونات التوليفة</p>
                  <p className="text-[11px]" style={{ color: "var(--muted-2)" }}>كل قطعة بلونها ومقاسها وسعرها الأصلي.</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {active.selections.map((selection) => (
                  <div key={selection.variantId} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1"><CompositionRow selection={selection} /></span>
                    <span className="money w-20 shrink-0 text-left text-[11px]" style={{ color: "var(--ink-soft)" }}>
                      {formatMoney(Number(selection.unitPrice) * Number(selection.quantity))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3 text-[11px]" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <span className="flex items-center gap-1.5 font-bold" style={{ color: "var(--muted)" }}>
                  <ShieldCheck size={13} style={{ color: "var(--success)" }} />سعر التوليفة يشمل خصم المنتجات
                </span>
                <span className="flex items-center gap-1.5 font-extrabold" style={{ color: "var(--lav-strong)" }}>
                  <Sparkles size={13} />{formatNumber(active.selections.length)} منتجات
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => setActiveId(null)} className="btn btn-outline">
                  <Check size={15} />إغلاق
                </button>
                <Link href={`/invoices/new?packageVariant=${active.id}`} className="btn btn-primary">
                  <ReceiptText size={15} />إصدار فاتورة بهذه التوليفة
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GiftMark() {
  return (
    <div className="text-center">
      <Layers3 size={40} style={{ color: "var(--lav-strong)" }} />
      <p className="mt-2 text-xs font-extrabold" style={{ color: "var(--lav-strong)" }}>بكدج لونيفا</p>
    </div>
  );
}
