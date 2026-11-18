"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Gift,
  Layers3,
  PackageOpen,
  Pencil,
  Sparkles,
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
import { formatMoney, formatNumber } from "@/lib/format";
import { discountPercent, packageStatusLabels, type PackageStatus } from "@/lib/packages";

export type PackageRow = {
  id: string;
  name: string;
  primary_sku: string;
  description: string | null;
  image_url: string | null;
  price_before_discount: string | number;
  price_after_discount: string | number;
  status: PackageStatus;
  badge: string | null;
  items_count: number;
  variants_count: number;
  starting_price: string | number;
  top_price: string | number;
  starting_before_price: string | number;
  stock_total: number;
  created_at: string;
  colors?: string[] | null;
  sizes?: string[] | null;
};

const tabs = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشطة" },
  { key: "draft", label: "مسودات" },
  { key: "archived", label: "مؤرشفة" },
] as const;

const statusOptions = tabs.map((tab) => ({ value: tab.key, label: tab.label }));

const statusStyle: Record<PackageStatus, string> = {
  active: "badge-success",
  draft: "badge-warning",
  archived: "badge-muted",
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));
}

export default function PackagesList({ packages }: { packages: PackageRow[] }) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters);
  const status = filters.status;

  const packageColors = useMemo(
    () => uniqueSorted(packages.flatMap((item) => (item.colors ?? []).map((color) => canonicalColorName(color)))),
    [packages],
  );
  const packageSizes = useMemo(
    () => uniqueSorted(packages.flatMap((item) => item.sizes ?? [])),
    [packages],
  );

  const counts = useMemo(
    () => ({
      all: packages.length,
      active: packages.filter((item) => item.status === "active").length,
      draft: packages.filter((item) => item.status === "draft").length,
      archived: packages.filter((item) => item.status === "archived").length,
    }),
    [packages],
  );

  const visible = useMemo(() => {
    const rows: Array<FilterableItem & { item: PackageRow }> = packages.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.primary_sku,
      description: item.description,
      colors: (item.colors ?? []).map((color) => canonicalColorName(color)),
      sizes: item.sizes ?? [],
      price: Number(item.starting_price ?? 0),
      discountPercent: discountPercent(Number(item.starting_before_price), Number(item.starting_price)),
      status: item.status,
      createdAt: item.created_at,
      searchText: `${item.badge ?? ""} ${item.items_count} منتجات ${item.variants_count} بكدج فرعي`,
      item,
    }));
    return filterAndSortItems(rows, filters).map((row) => row.item);
  }, [filters, packages]);

  return (
    <>
      <FilterBar
        key={JSON.stringify(filters)}
        filters={filters}
        colors={packageColors}
        sizes={packageSizes}
        statusOptions={statusOptions}
        mode="local"
        onChange={setFilters}
        resultCount={visible.length}
        totalCount={packages.length}
      />

      <section className="app-card overflow-hidden">
      <div className="border-b p-5 sm:p-6" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
              <Layers3 size={21} />
            </span>
            <div>
              <h2 className="section-title">كل البكدجات</h2>
              <p className="mt-0.5 text-xs muted">{formatNumber(packages.length)} بكدج · {formatNumber(packages.reduce((sum, item) => sum + Number(item.variants_count || 0), 0))} بكدج فرعي</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-1 rounded-xl p-1" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, status: tab.key }))}
                  className="rounded-lg px-3 py-2 text-xs font-extrabold transition"
                  style={
                    status === tab.key
                      ? { background: "var(--surface)", color: "var(--brand-strong)", boxShadow: "var(--shadow-sm)" }
                      : { color: "var(--muted)" }
                  }
                >
                  {tab.label}
                  <span className="ms-1.5 opacity-60">{counts[tab.key]}</span>
                </button>
              ))}
            </div>
            <span className="badge badge-brand self-start sm:self-auto">
              {formatNumber(visible.length)} / {formatNumber(packages.length)} ظاهر
            </span>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div>
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
              {packages.length ? <PackageOpen size={28} /> : <Gift size={28} />}
            </span>
            <p className="font-extrabold" style={{ color: "var(--ink)" }}>
              {packages.length ? "لا توجد نتائج مطابقة" : "ابدئي أول عرض مجمّع"}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm muted">
              {packages.length ? "جرّبي كلمة بحث مختلفة أو غيّري فلتر الحالة." : "اجمعي منتجاتك في بكدج واحد، ثم ولّدي بكدجات فرعية بكل الألوان والمقاسات."}
            </p>
            {!packages.length && (
              <Link href="/packages/new" className="btn btn-primary mt-5">
                <Sparkles size={16} />إنشاء أول بكدج
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {visible.map((item) => {
            const savings = Math.max(0, Number(item.starting_before_price) - Number(item.starting_price));
            const percent = discountPercent(Number(item.starting_before_price), Number(item.starting_price));
            return (
              <article key={item.id} className="group overflow-hidden rounded-[1.4rem] transition hover:-translate-y-1" style={{ border: "1px solid var(--line)", background: "var(--surface-2)", boxShadow: "var(--shadow-sm)" }}>
                <Link href={`/packages/${item.id}`} className="relative block h-44 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full w-full place-items-center" style={{ background: "linear-gradient(135deg, var(--brand-soft), var(--surface-3))" }}>
                      <Gift size={38} style={{ color: "var(--brand)" }} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                    <span className={`badge ${statusStyle[item.status]}`}>{packageStatusLabels[item.status]}</span>
                    {percent > 0 && <span className="badge badge-dark backdrop-blur-sm">خصم {formatNumber(percent)}%</span>}
                  </div>
                  {item.badge && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-[#7c4354] shadow-sm backdrop-blur">
                      {item.badge}
                    </span>
                  )}
                </Link>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/packages/${item.id}`} className="line-clamp-1 text-base font-extrabold transition hover:opacity-80" style={{ color: "var(--ink)" }}>
                        {item.name}
                      </Link>
                      <p className="mono mt-1 text-[11px] tracking-wide" dir="ltr" style={{ color: "var(--muted-2)" }}>{item.primary_sku}</p>
                    </div>
                    <Link href={`/packages/${item.id}/edit`} className="btn-icon" title="تعديل البكدج" aria-label="تعديل البكدج">
                      <Pencil size={16} />
                    </Link>
                  </div>

                  {item.description && <p className="mt-2 line-clamp-2 text-xs leading-6 muted">{item.description}</p>}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="badge badge-muted"><Boxes size={12} />{formatNumber(item.items_count)} منتجات</span>
                    <span className="badge badge-brand"><Layers3 size={12} />{formatNumber(item.variants_count)} بكدج فرعي</span>
                    <span className="badge badge-lav"><Tag size={12} />{formatNumber(item.stock_total)} بالمخزون</span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                    <div>
                      <p className="text-[10px] font-bold muted-2">يبدأ من</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="money text-lg" style={{ color: "var(--brand-strong)" }}>{formatMoney(item.starting_price)}</span>
                        {savings > 0 && <span className="text-xs line-through muted-2">{formatMoney(item.starting_before_price)}</span>}
                      </div>
                      {savings > 0 && <p className="mt-0.5 text-[10px] font-bold" style={{ color: "var(--success)" }}>توفير {formatMoney(savings)}</p>}
                    </div>
                    <Link href={`/packages/${item.id}`} className="inline-flex items-center gap-1 text-xs font-extrabold" style={{ color: "var(--brand-strong)" }}>
                      التفاصيل <ArrowLeft size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </section>
    </>
  );
}
