"use client";

import {
  BadgePercent,
  Boxes,
  CalendarDays,
  ChevronLeft,
  Expand,
  Layers3,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import InvoiceCta from "@/components/invoice-cta";
import ZoomableImage from "@/components/zoomable-image";
import { colorInk, colorSwatch, canonicalColorName } from "@/lib/colors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { discountPercent } from "@/lib/packages";
import { useToast } from "@/components/toast";

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
  stock?: number;
  min_stock_alert?: number;
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
  const toast = useToast();
  const [items, setItems] = useState<ShowcaseVariant[]>(variants);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? "");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const selected = items.find((variant) => variant.id === selectedId) ?? items[0];

  async function adjustStock(variantId: string, delta: number) {
    if (adjustingId) return;
    setAdjustingId(variantId);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, delta, type: delta > 0 ? "restock" : "damage_or_loss" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تعديل المخزون.");
      setItems((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, stock: data.result.newStock } : v)),
      );
      toast.success("تم تحديث المخزون", `الرصيد الجديد: ${data.result.newStock} قطعة`);
    } catch (err) {
      toast.error("خطأ بالمخزون", err instanceof Error ? err.message : "تعذر تعديل المخزون.");
    } finally {
      setAdjustingId(null);
    }
  }

  const colorGroups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sizes: Set<string>; min: number; max: number; count: number }
    >();
    for (const variant of items) {
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
  }, [items]);

  const colors = useMemo(() => colorGroups.map((group) => group.name), [colorGroups]);
  const sizes = useMemo(() => Array.from(new Set(items.map((variant) => variant.size))), [items]);

  const stats = useMemo(() => {
    const priced = items.map(variantNumbers);
    const min = priced.length ? Math.min(...priced.map((item) => item.after)) : 0;
    const max = priced.length ? Math.max(...priced.map((item) => item.after)) : 0;
    const topDiscount = priced.reduce((best, item) => Math.max(best, item.percent), 0);
    const totalSaving = priced.reduce((sum, item) => sum + item.saving, 0);
    return { min, max, topDiscount, totalSaving };
  }, [items]);

  const selectedNumbers = selected ? variantNumbers(selected) : null;

  const gallery = useMemo(() => {
    const seen = new Set<string>();
    const galleryList: { url: string; variant: ShowcaseVariant | null }[] = [];
    if (product.image_url) {
      seen.add(product.image_url);
      galleryList.push({ url: product.image_url, variant: null });
    }
    for (const variant of items) {
      if (variant.image_url && !seen.has(variant.image_url)) {
        seen.add(variant.image_url);
        galleryList.push({ url: variant.image_url, variant });
      }
    }
    return galleryList;
  }, [product.image_url, items]);

  const galleryUrls = gallery.map((item) => item.url);
  const heroImage = gallery[activeImageIndex]?.url ?? product.image_url ?? selected?.image_url ?? null;
  const selectedColorName = selected ? canonicalColorName(selected.color) || selected.color : "";

  function focusVariant(variant: ShowcaseVariant) {
    setSelectedId(variant.id);
    if (variant.image_url) {
      const index = galleryUrls.indexOf(variant.image_url);
      if (index >= 0) setActiveImageIndex(index);
    }
  }

  function pickColor(color: string) {
    const isSameColor = (variant: ShowcaseVariant) =>
      (canonicalColorName(variant.color) || variant.color) === color;
    const sameSize = items.find((variant) => isSameColor(variant) && variant.size === selected?.size);
    const fallback = items.find(isSameColor);
    const target = sameSize ?? fallback;
    if (target) focusVariant(target);
  }

  function pickSize(size: string) {
    const sameColor = items.find((variant) => matchesSelectedColor(variant) && variant.size === size);
    const fallback = items.find((variant) => variant.size === size);
    const target = sameColor ?? fallback;
    if (target) focusVariant(target);
  }

  function matchesSelectedColor(variant: ShowcaseVariant) {
    return (canonicalColorName(variant.color) || variant.color) === selectedColorName;
  }

  const sizesForColor = new Set(items.filter(matchesSelectedColor).map((variant) => variant.size));
  const colorsForSize = new Set(
    items
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
                  src={heroImage}
                  alt={selected ? `${product.name} — ${canonicalColorName(selected.color)} ${selected.size}` : product.name}
                  images={galleryUrls}
                  initialIndex={activeImageIndex}
                  className="h-full min-h-[280px] w-full sm:min-h-[360px] lg:min-h-[430px]"
                />
              ) : (
                <div className="grid h-full min-h-[280px] place-items-center">
                  <div className="text-center">
                    <Tag size={54} className="mx-auto" style={{ color: "var(--lav-strong)" }} />
                    <p className="mt-3 text-sm font-extrabold" style={{ color: "var(--lav-strong)" }}>منتج لونيفا</p>
                  </div>
                </div>
              )}

              {heroImage && (
                <span className="pointer-events-none absolute right-3 top-12 inline-flex items-center gap-1 rounded-full bg-[#21151a]/55 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur-sm">
                  <Expand size={10} />اضغط للتكبير
                </span>
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
                    style={{ background: colorSwatch(selected.color), color: colorInk(selected.color) }}
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
                {gallery.map((item, index) => {
                  const active = index === activeImageIndex;
                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(index);
                        if (item.variant) focusVariant(item.variant);
                      }}
                      className="relative h-14 w-14 overflow-hidden rounded-xl transition motion-reduce:transition-none"
                      style={{
                        border: active ? "2px solid var(--lav-strong)" : "1px solid var(--line)",
                        background: "var(--surface)",
                        opacity: active ? 1 : 0.75,
                        boxShadow: active ? "0 6px 16px var(--lav-ring)" : "none",
                      }}
                      aria-label={item.variant ? `${canonicalColorName(item.variant.color)} ${item.variant.size}` : "الصورة الأساسية"}
                      aria-pressed={active}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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

                <InvoiceCta
                  href={`/invoices/new?productVariant=${selected.id}`}
                  label="إصدار فاتورة بهذا المتغير"
                  variant="compact"
                  className="mt-3.5 w-full"
                />
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
                      const ink = colorInk(group.name);
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
                  style={{ background: colorSwatch(selected.color), color: colorInk(selected.color) }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,.85)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)" }} />
                  {canonicalColorName(selected.color)}
                </span>
                <span className="badge badge-muted">مقاس {selected.size}</span>
                <span className="mono badge badge-muted" dir="ltr">{selected.sku}</span>
                {selected.stock !== undefined && (
                  selected.stock === 0 ? (
                    <span className="badge badge-warning">نفد المخزون</span>
                  ) : selected.stock <= (selected.min_stock_alert ?? 3) ? (
                    <span className="badge badge-warning">مخزون منخفض ({selected.stock} قطعة)</span>
                  ) : (
                    <span className="badge badge-success">المخزون المتوفر: {selected.stock} قطعة</span>
                  )
                )}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
            <p className="eyebrow">المتغيرات</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>الألوان والمقاسات</h2>
            <p className="mt-1 text-xs muted">اختاري أي متغير لعرض صورته وسعره بالتفصيل — كل الأسعار تشمل الخصم.</p>
          </div>
          <Link href={`/products/${product.id}/edit`} className="btn btn-lav self-start sm:self-auto">
            <Package size={15} />إدارة المتغيرات
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((variant) => {
            const numbers = variantNumbers(variant);
            const active = variant.id === selected?.id;
            const colorName = canonicalColorName(variant.color) || variant.color;
            const stock = variant.stock ?? 0;
            const minAlert = variant.min_stock_alert ?? 3;
            const isAdjusting = adjustingId === variant.id;

            return (
              <article
                key={variant.id}
                className="app-card flex flex-col justify-between p-3.5 transition hover:-translate-y-0.5 motion-reduce:transition-none"
                style={{
                  borderColor: active ? "var(--lav-strong)" : "var(--line)",
                  boxShadow: active ? "0 12px 30px var(--lav-ring)" : "var(--shadow-sm)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
                    style={{ background: "linear-gradient(135deg, var(--lav-soft), var(--surface-3))", border: "1px solid var(--line)" }}
                  >
                    <ZoomableImage
                      src={variant.image_url}
                      alt={`${product.name} ${colorName} ${variant.size}`}
                      images={galleryUrls}
                      initialIndex={variant.image_url ? Math.max(0, galleryUrls.indexOf(variant.image_url)) : 0}
                      className="h-full w-full"
                      placeholder={
                        <span className="grid h-full w-full place-items-center">
                          <span className="h-7 w-7 rounded-full" style={{ background: colorSwatch(variant.color), border: "1px solid rgba(0,0,0,.12)" }} />
                        </span>
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => focusVariant(variant)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-right"
                    aria-pressed={active}
                    aria-label={`اختيار ${colorName} مقاس ${variant.size}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorSwatch(variant.color), border: "1px solid rgba(0,0,0,.12)" }} />
                        <span className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>
                          {colorName} · {variant.size}
                        </span>
                        {active && <span className="badge badge-lav shrink-0">محدد</span>}
                      </span>
                      <span className="mono mt-0.5 block truncate text-[10px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{variant.sku}</span>
                      <span className="mt-1 flex flex-wrap items-baseline gap-1.5">
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
                </div>

                {/* Stock Controls */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center gap-1.5">
                    <Boxes size={13} style={{ color: "var(--muted-2)" }} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      stock === 0 ? "bg-rose-500/10 text-rose-600" :
                      stock <= minAlert ? "bg-amber-500/10 text-amber-600" :
                      "bg-emerald-500/10 text-emerald-600"
                    }`}>
                      {stock === 0 ? "نفد المخزون (0)" : stock <= minAlert ? `نقص (${stock} ق)` : `${stock} قطعة بالمخزن`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold muted-2 me-1">تعديل:</span>
                    <button
                      type="button"
                      disabled={isAdjusting || stock <= 0}
                      onClick={() => adjustStock(variant.id, -1)}
                      className="grid h-7 w-7 place-items-center rounded-lg border text-xs font-bold transition hover:bg-[var(--surface-3)] disabled:opacity-30"
                      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
                      title="خصم قطعة"
                      aria-label="خصم قطعة"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={isAdjusting}
                      onClick={() => adjustStock(variant.id, 1)}
                      className="grid h-7 w-7 place-items-center rounded-lg border text-xs font-bold transition hover:bg-[var(--surface-3)] disabled:opacity-30"
                      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
                      title="إضافة قطعة"
                      aria-label="إضافة قطعة"
                    >
                      {isAdjusting ? <LoaderCircle size={12} className="animate-spin" /> : <Plus size={12} />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
