"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  Boxes,
  Layers3,
  Package,
  PackageOpen,
  Plus,
  Tag,
} from "lucide-react";
import { useMemo, useState } from "react";
import FilterBar from "@/components/catalog-filter-bar";
import {
  emptyFilters,
  filterAndSortItems,
  type CatalogFilters,
  type FilterableItem,
} from "@/lib/catalog-filters";
import { canonicalColorName } from "@/lib/colors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  primary_sku: string;
  image_url?: string | null;
  variant_count: number;
  starting_price: string | number | null;
  top_price?: string | number | null;
  starting_before_price?: string | number | null;
  top_discount?: string | number | null;
  created_at: string;
  colors?: string[] | null;
  sizes?: string[] | null;
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));
}

export default function ProductsList({ products }: { products: Product[] }) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);

  const productColors = useMemo(
    () =>
      uniqueSorted(
        products.flatMap((product) => (product.colors ?? []).map((color) => canonicalColorName(color))),
      ),
    [products],
  );
  const productSizes = useMemo(
    () => uniqueSorted(products.flatMap((product) => product.sizes ?? [])),
    [products],
  );

  const visible = useMemo(() => {
    const rows: Array<FilterableItem & { product: Product }> = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.primary_sku,
      colors: (product.colors ?? []).map((color) => canonicalColorName(color)),
      sizes: product.sizes ?? [],
      price: Number(product.starting_price ?? 0),
      discountPercent: Number(product.top_discount ?? 0),
      createdAt: product.created_at,
      searchText: `${product.variant_count} متغير`,
      product,
    }));
    return filterAndSortItems(rows, filters).map((row) => row.product);
  }, [filters, products]);

  const totalVariants = products.reduce((sum, product) => sum + Number(product.variant_count || 0), 0);
  const withVariants = products.filter((product) => Number(product.variant_count) > 0).length;
  const startingPrice = products.reduce((min, product) => {
    const price = Number(product.starting_price || 0);
    if (price <= 0) return min;
    return min === 0 ? price : Math.min(min, price);
  }, 0);
  const topDiscount = products.reduce((best, product) => Math.max(best, Number(product.top_discount || 0)), 0);

  const stats = [
    { label: "إجمالي المنتجات", value: formatNumber(products.length), hint: `${formatNumber(withVariants)} جاهز للبيع`, icon: Package, tone: "lav" },
    { label: "المتغيرات", value: formatNumber(totalVariants), hint: "لون ومقاس لكل منتج", icon: Layers3, tone: "brand" },
    { label: "أقل سعر", value: startingPrice ? formatMoney(startingPrice) : "—", hint: "بين جميع المتغيرات", icon: Tag, tone: "success" },
    { label: "أعلى خصم", value: topDiscount ? `${formatNumber(topDiscount)}%` : "—", hint: "على مستوى المتغيرات", icon: BadgePercent, tone: "warning" },
  ];

  const toneStyles: Record<string, { background: string; color: string }> = {
    brand: { background: "var(--brand-soft)", color: "var(--brand-strong)" },
    lav: { background: "var(--lav-soft)", color: "var(--lav-strong)" },
    success: { background: "var(--success-soft)", color: "var(--success)" },
    warning: { background: "var(--warning-soft)", color: "var(--warning)" },
  };

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">كتالوج لونيفا</p>
          <h1 className="page-title mt-1">المنتجات</h1>
          <p className="page-subtitle mt-2 max-w-xl">نظّمي المنتجات ومتغيرات اللون والمقاس والأسعار في كتالوج واحد مرتب.</p>
        </div>
        <Link href="/products/new" className="btn btn-product">
          <Plus size={18} />إضافة منتج
        </Link>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <FilterBar
        key={JSON.stringify(filters)}
        filters={filters}
        colors={productColors}
        sizes={productSizes}
        mode="local"
        onChange={setFilters}
        resultCount={visible.length}
        totalCount={products.length}
      />

      <section className="app-card overflow-hidden">
        <div className="border-b p-5 sm:p-6" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                <Boxes size={21} />
              </span>
              <div>
                <h2 className="section-title">كل المنتجات</h2>
                <p className="mt-0.5 text-xs muted">{formatNumber(products.length)} منتج · {formatNumber(totalVariants)} متغير</p>
              </div>
            </div>
            <span className="badge badge-brand self-start sm:self-auto">
              {formatNumber(visible.length)} / {formatNumber(products.length)} ظاهر
            </span>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <div>
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                {products.length ? <PackageOpen size={28} /> : <Package size={28} />}
              </span>
              <p className="font-extrabold" style={{ color: "var(--ink)" }}>
                {products.length ? "لا توجد نتائج مطابقة" : "ابدئي كتالوجك بأول منتج"}
              </p>
              <p className="mx-auto mt-2 max-w-xs text-sm muted">
                {products.length ? "جرّبي اسمًا أو كودًا مختلفًا." : "أضيفي منتجًا وحددي ألوانه ومقاساته وأسعاره لتبدأي بناء البكدجات."}
              </p>
              {!products.length && (
                <Link href="/products/new" className="btn btn-product mt-5"><Plus size={16} />إضافة أول منتج</Link>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {visible.map((product) => {
              const after = Number(product.starting_price || 0);
              const rawBefore = Number(product.starting_before_price || 0);
              const before = rawBefore > after ? rawBefore : 0;
              const percent = Number(product.top_discount || 0);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[var(--surface-2)] sm:px-6"
                >
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{product.name}</p>
                    <p className="mono mt-1 text-[11px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{product.primary_sku}</p>
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="flex items-center justify-end gap-1.5">
                      {percent > 0 && <span className="badge badge-success"><BadgePercent size={10} />{formatNumber(percent)}%</span>}
                      <p className="text-[10px] muted-2">يبدأ من</p>
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-end gap-2">
                      <p className="money text-sm" style={{ color: "var(--lav-strong)" }}>
                        {Number(product.variant_count) > 0 ? formatMoney(after) : "—"}
                      </p>
                      {before > 0 && <span className="text-[10px] line-through muted-2">{formatMoney(before)}</span>}
                    </div>
                  </div>
                  <span className="badge badge-lav shrink-0"><Layers3 size={11} />{formatNumber(product.variant_count)}</span>
                  <span className="hidden w-28 text-xs muted md:block">{formatDate(product.created_at)}</span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-hover:bg-[var(--lav-soft)]" style={{ color: "var(--muted-2)" }}>
                    <ArrowLeft size={17} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
