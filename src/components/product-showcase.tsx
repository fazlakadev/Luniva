"use client";

import {
  BadgePercent,
  CalendarDays,
  ChevronLeft,
  Layers3,
  Package,
  ReceiptText,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import ZoomableImage from "@/components/zoomable-image";
import { colorInk, colorSwatch, canonicalColorName } from "@/lib/colors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";
export type ShowcaseVariant = {
  id: string;
  color: string;
  size: string;
  sku: string;
  price: string | number;
  price_before_discount: string | number | null;
  discount_type: string | null;
  discount_value: string | number | null;
  image_url: string | null;
};

export type ShowcaseProduct = {
  id: string;
  name: string;
  primary_sku: string;
  description: string | null;
  image_url: string | null;
  created_at: string | Date;
};

function variantNumbers(variant: ShowcaseVariant) {
  const before = Number(variant.price_before_discount || 0);
  const after = Number(variant.price || 0);
  const hasDiscount = before > after;
  return {
    before: hasDiscount ? before : after,
    after,
    percent: discountPercent(before, after),
    saving: hasDiscount ? before - after : 0,
    hasDiscount,
  };
}

export default function ProductShowcase({
  product,
  variants,
}: {
  product: ShowcaseProduct;
  variants: ShowcaseVariant[];
}) {
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? "");

  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  const colorGroups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sizes: Set<string>; min: number; max: number; count: number }
    >();
    for (const variant of variants) {
      const name = canonicalColorName(variant.color) || variant.color;
      const numbers = variantNumbers(variant);
      const entry =
        map.get(name) ?? { name, sizes: new Set<string>(), min: numbers.after, max: numbers.after, count: 0 };
      entry.sizes.add(variant.size);
      entry.min = Math.min(entry.min, numbers.after);
      entry.max = Math.max(entry.max, numbers.after);
      entry.count += 1;
      map.set(name, entry);
    }
    return Array.from(map.values());
  }, [variants]);

  const colors = useMemo(() => colorGroups.map((group) => group.name), [colorGroups]);
  const sizes = useMemo(() => Array.from(new Set(variants.map((variant) => variant.size))), [variants]);

  const stats = useMemo(() => {
    const priced = variants.map(variantNumbers);
    const min = priced.length ? Math.min(...priced.map((item) => item.after)) : 0;
    const max = priced.length ? Math.max(...priced.map((item) => item.after)) : 0;
    const topDiscount = priced.reduce((best, item) => Math.max(best, item.percent), 0);
    const totalSaving = priced.reduce((sum, item) => sum + item.saving, 0);
    return { min, max, topDiscount, totalSaving };
  }, [variants]);

  const selectedNumbers = selected ? variantNumbers(selected) : null;
  const heroImage = selected?.image_url || product.image_url;

  const gallery = useMemo(() => {
    const seen = new Set<string>();
    const items: { url: string; variant: ShowcaseVariant | null }[] = [];
    if (product.image_url) {
      seen.add(product.image_url);
      items.push({ url: product.image_url, variant: null });
    }
    for (const variant of variants) {
      if (variant.image_url && !seen.has(variant.image_url)) {
        seen.add(variant.image_url);
        items.push({ url: variant.image_url, variant });
      }
    }
    return items;
  }, [product.image_url, variants]);

  const selectedColorName = selected ? canonicalColorName(selected.color) || selected.color : "";

  function pickColor(color: string) {
    const isSameColor = (variant: ShowcaseVariant) =>
      (canonicalColorName(variant.color) || variant.color) === color;
    const sameSize = variants.find((variant) => isSameColor(variant) && variant.size === selected?.size);
    const fallback = variants.find(isSameColor);
    const target = sameSize ?? fallback;
    if (target) setSelectedId(target.id);
  }

  function pickSize(size: string) {
    const sameColor = variants.find((variant) => matchesSelectedColor(variant) && variant.size === size);
    const fallback = variants.find((variant) => variant.size === size);
    const target = sameColor ?? fallback;
    if (target) setSelectedId(target.id);
  }

  function matchesSelectedColor(variant: ShowcaseVariant) {
    return (canonicalColorName(variant.color) || variant.color) === selectedColorName;
  }

  const sizesForColor = new Set(variants.filter(matchesSelectedColor).map((variant) => variant.size));
  const colorsForSize = new Set(
    variants
      .filter((variant) => variant.size === selected?.size)
      .map((variant) => canonicalColorName(variant.color) || variant.color),
  );

  return (
    <>
      <section className="app-card overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          {/* Gallery */}
          <div className="relative flex flex-col" style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))" }}>
            <div className="relative min-h-[280px] flex-1 overflow-hidden sm:min-h-[360px] lg:min-h-[430px]">
              {heroImage ? (
                <ZoomableImage
                  key={heroImage}
                  src={heroImage}
                  alt={selected ? `${product.name} — ${selected.color} ${selected.size}` : product.name}
                  className="h-full min-h-[280px] w-full sm:min-h-[360px] lg:min-h-[430px]"
                />
              ) : (
                <div className="grid h-full min-h-[280px] place-items-center">
                  <div className="text-center">
                    <Tag size={54} className="mx-auto" style={{ color: "var(--lav-strong)" }} />
                    <p className="mt-3 text-sm font-extrabold" style={{ color: "var(--lav-strong)" }}>Luniva product</p>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                <span className="badge badge-lav shadow-sm"><Sparkles size={12} />منتج</span>
                {selectedNumbers?.hasDiscount ? (
                  <span className="badge badge-success shadow-sm">
                    <BadgePercent size={12} />خصم {formatNumber(selectedNumbers.percent)}%
                  </span>
                ) : stats.topDiscount > 0 ? (
                  <span className="badge badge-success shadow-sm">خصم يصل إلى {formatNumber(stats.topDiscount)}%</span>
                ) : null}
              </div>

              {selected && (
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm"
                    style={{ background: colorSwatch(selected.color), color: colorInk(colorSwatch(selected.color)) }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,.85)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)" }} />
                    {canonicalColorName(selected.color)}
                  </span>
                  <span className="badge badge-dark">مقاس {selected.size}</span>
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex flex-wrap gap-2 p-3" style={{ background: "color-mix(in srgb, var(--surface) 70%, transparent)" }}>
                {gallery.map((item) => {
                  const active = item.variant ? item.variant.id === selected?.id : !selected?.image_url;
                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => item.variant && setSelectedId(item.variant.id)}
                      className="relative h-14 w-14 overflow-hidden rounded-xl transition"
                      style={{
                        border: active ? "2px solid var(--lav-strong)" : "1px solid var(--line)",
                        background: "var(--surface)",
                        opacity: active ? 1 : 0.75,
                      }}
                      aria-label={item.variant ? `${item.variant.color} ${item.variant.size}` : "الصورة الأساسية"}
                    >
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-muted"><CalendarDays size={12} />{formatDate(product.created_at)}</span>
              <span className="badge badge-lav"><Layers3 size={12} />{formatNumber(variants.length)} متغير</span>
              {selected && <span className="mono badge badge-muted" dir="ltr">{selected.sku}</span>}
            </div>

            <h1 className="page-title mt-3">{product.name}</h1>
            <p className="mono mt-1.5 text-[11px] font-bold tracking-wide" dir="ltr" style={{ color: "var(--muted-2)" }}>{product.primary_sku}</p>
            {product.description && <p className="mt-3 max-w-xl text-sm leading-7 muted">{product.description}</p>}

            {/* Live price */}
            {selected && selectedNumbers && (
              <div
                className="mt-5 rounded-2xl p-4"
                style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-2))", border: "1px solid color-mix(in srgb, var(--lav) 28%, var(--line))" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold tracking-widest" style={{ color: "var(--lav-strong)" }}>
                      السعر النهائي
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <p className="money text-[2rem] leading-none" style={{ color: "var(--lav-strong)" }}>
                        {formatMoney(selectedNumbers.after)}
                      </p>
                      {selectedNumbers.hasDiscount && (
                        <span className="text-sm line-through" style={{ color: "var(--muted-2)" }}>
                          {formatMoney(selectedNumbers.before)}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedNumbers.hasDiscount ? (
                    <div className="text-left">
                      <span className="badge badge-success"><BadgePercent size={11} />خصم {formatNumber(selectedNumbers.percent)}%</span>
                      <p className="mt-1 text-[11px] font-extrabold" style={{ color: "var(--success)" }}>
                        توفير {formatMoney(selectedNumbers.saving)}
                      </p>
                    </div>
                  ) : (
                    <span className="badge badge-muted">بدون خصم</span>
                  )}
                </div>

                {selectedNumbers.hasDiscount && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--surface) 70%, transparent)" }}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${Math.min(100, selectedNumbers.percent)}%`, background: "linear-gradient(90deg, var(--success), var(--lav-strong))" }}
                    />
                  </div>
                )}

                <Link
                  href={`/invoices/new?productVariant=${selected.id}`}
                  className="btn btn-product mt-3.5 w-full"
                >
                  <ReceiptText size={15} />إصدار فاتورة بهذا المتغير
                </Link>
              </div>
            )}

            {/* Variant pickers */}
            {variants.length > 0 && (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-extrabold" style={{ color: "var(--ink-soft)" }}>
                    <Tag size={13} />اللون
                    <span className="badge badge-muted">{formatNumber(colors.length)} ألوان</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colorGroups.map((group) => {
                      const active = selectedColorName === group.name;
                      const hex = colorSwatch(group.name);
                      const ink = colorInk(hex);
                      return (
                        <button
                          key={group.name}
                          type="button"
                          onClick={() => pickColor(group.name)}
                          disabled={!colorsForSize.has(group.name)}
                          title={`${group.name} · ${formatNumber(group.count)} متغير · ${formatMoney(group.min)}${group.max > group.min ? ` – ${formatMoney(group.max)}` : ""}`}
                          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition disabled:opacity-35"
                          style={
                            active
                              ? { background: hex, color: ink, border: `1px solid ${hex}`, boxShadow: `0 8px 20px ${hex}45` }
                              : { background: "var(--surface-2)", color: "var(--ink-soft)", border: "1px solid var(--line)" }
                          }
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-full"
                            style={{
                              background: hex,
                              boxShadow: active ? "inset 0 0 0 2px rgba(255,255,255,.6)" : "inset 0 0 0 1px rgba(0,0,0,.15)",
                            }}
                          />
                          {group.name}
                          <span className="text-[9px] font-bold opacity-70">
                            · {Array.from(group.sizes).slice(0, 2).join("، ")}
                            {group.sizes.size > 2 ? ` +${formatNumber(group.sizes.size - 2)}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-extrabold" style={{ color: "var(--ink-soft)" }}>
                    <Layers3 size={13} />المقاس
                    <span className="badge badge-muted">{formatNumber(sizes.length)} مقاسات</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => {
                      const active = selected?.size === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => pickSize(size)}
                          disabled={!sizesForColor.has(size)}
                          className="min-w-12 rounded-xl px-3 py-2 text-center text-xs font-extrabold transition disabled:opacity-35"
                          style={
                            active
                              ? { background: "var(--lav-strong)", color: "#fff", border: "1px solid var(--lav-strong)" }
                              : { background: "var(--surface-2)", color: "var(--ink-soft)", border: "1px solid var(--line)" }
                          }
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Pickers summary */}
            {selected && (
              <div
                className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5"
                style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
              >
                <span className="text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>المتغير المحدد</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                  style={{ background: colorSwatch(selected.color), color: colorInk(colorSwatch(selected.color)) }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,.85)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)" }} />
                  {canonicalColorName(selected.color)}
                </span>
                <span className="badge badge-muted">مقاس {selected.size}</span>
                <span className="mono badge badge-muted" dir="ltr">{selected.sku}</span>
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Wallet size={15} className="mx-auto" style={{ color: "var(--brand-strong)" }} />
                <p className="money mt-1.5 text-sm" style={{ color: "var(--ink)" }}>{formatMoney(stats.min)}</p>
                <p className="text-[10px] muted">أقل سعر</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <Wallet size={15} className="mx-auto" style={{ color: "var(--lav-strong)" }} />
                <p className="money mt-1.5 text-sm" style={{ color: "var(--ink)" }}>{formatMoney(stats.max)}</p>
                <p className="text-[10px] muted">أعلى سعر</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
                <BadgePercent size={15} className="mx-auto" style={{ color: "var(--success)" }} />
                <p className="mt-1.5 text-sm font-extrabold" style={{ color: "var(--ink)" }}>{formatNumber(stats.topDiscount)}%</p>
                <p className="text-[10px] muted">أعلى خصم</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All variants */}
      <section className="mt-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Variants</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>الألوان والمقاسات</h2>
            <p className="mt-1 text-xs muted">اختاري أي متغير لعرض صورته وسعره بالتفصيل — كل الأسعار تشمل الخصم.</p>
          </div>
          <Link href={`/products/${product.id}/edit`} className="btn btn-lav self-start sm:self-auto">
            <Package size={15} />إدارة المتغيرات
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {variants.map((variant) => {
            const numbers = variantNumbers(variant);
            const active = variant.id === selected?.id;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                className="app-card flex items-center gap-3 p-3 text-right transition hover:-translate-y-0.5"
                style={{
                  borderColor: active ? "var(--lav-strong)" : "var(--line)",
                  boxShadow: active ? "0 12px 30px var(--lav-ring)" : "var(--shadow-sm)",
                }}
                aria-pressed={active}
              >
                <span
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
                  style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))", border: "1px solid var(--line)" }}
                >
                  {variant.image_url ? (
                    <img src={variant.image_url} alt={`${variant.color} ${variant.size}`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center">
                      <span className="h-7 w-7 rounded-full" style={{ background: colorSwatch(variant.color), border: "1px solid rgba(0,0,0,.12)" }} />
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorSwatch(variant.color), border: "1px solid rgba(0,0,0,.12)" }} />
                    <span className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                      {canonicalColorName(variant.color)} · {variant.size}
                    </span>
                    {active && <span className="badge badge-lav shrink-0">محدد</span>}
                  </span>
                  <span className="mono mt-0.5 block truncate text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{variant.sku}</span>
                  <span className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                    <span className="money text-base" style={{ color: "var(--lav-strong)" }}>{formatMoney(numbers.after)}</span>
                    {numbers.hasDiscount && (
                      <span className="text-[11px] line-through" style={{ color: "var(--muted-2)" }}>{formatMoney(numbers.before)}</span>
                    )}
                    {numbers.hasDiscount && (
                      <span className="badge badge-success">-{formatNumber(numbers.percent)}%</span>
                    )}
                  </span>
                </span>

                <ChevronLeft size={17} className="shrink-0" style={{ color: active ? "var(--lav-strong)" : "var(--muted-2)" }} />
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
