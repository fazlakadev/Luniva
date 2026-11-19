"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  activeFilterCount,
  emptyFilters,
  filtersToQuery,
  type CatalogFilters,
  type CatalogSort,
} from "@/lib/catalog-filters";
import { colorInk, colorSwatch } from "@/lib/colors";
import PriceRangeSlider from "@/components/ui/slider-06";

type FilterBarProps = {
  filters: CatalogFilters;
  colors?: string[];
  sizes?: string[];
  statusOptions?: Array<{ value: string; label: string }>;
  mode?: "url" | "local";
  basePath?: string;
  resultCount?: number;
  totalCount?: number;
  onChange?: (filters: CatalogFilters) => void;
  /**
   * Public catalogs only: when the real price bounds are known, the two numeric
   * price fields are replaced by a dual-thumb range slider.
   */
  priceBounds?: { min: number; max: number };
};

const sortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: "featured", label: "الترتيب الافتراضي" },
  { value: "price-asc", label: "السعر: الأقل أولًا" },
  { value: "price-desc", label: "السعر: الأعلى أولًا" },
  { value: "discount", label: "أعلى خصم" },
  { value: "name", label: "الاسم أبجديًا" },
  { value: "newest", label: "الأحدث" },
];

/** One polished search/filter surface, URL-driven in public catalogs and state-driven in admin lists. */
export default function FilterBar({
  filters,
  colors = [],
  sizes = [],
  statusOptions,
  mode = "url",
  basePath,
  resultCount,
  totalCount,
  onChange,
  priceBounds,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<CatalogFilters>(filters);

  function apply(next: CatalogFilters) {
    setDraft(next);
    if (mode === "local") {
      onChange?.(next);
      return;
    }
    const query = filtersToQuery(next);
    router.push(query ? `${basePath || pathname}?${query}` : basePath || pathname);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ ...draft, q: draft.q.trim() });
  }

  const activeCount = activeFilterCount(filters);

  const priceValue: [number, number] | null = priceBounds
    ? filters.minPrice !== null || filters.maxPrice !== null
      ? [filters.minPrice ?? priceBounds.min, filters.maxPrice ?? priceBounds.max]
      : null
    : null;
  const priceStep = priceBounds
    ? priceBounds.max - priceBounds.min > 4000
      ? 50
      : priceBounds.max - priceBounds.min > 1000
        ? 25
        : priceBounds.max - priceBounds.min > 200
          ? 5
          : 1
    : 1;

  function applyPrice(range: [number, number]) {
    if (!priceBounds) return;
    const isFull = range[0] <= priceBounds.min && range[1] >= priceBounds.max;
    apply({ ...draft, minPrice: isFull ? null : range[0], maxPrice: isFull ? null : range[1] });
  }

  function clearChip(key: keyof CatalogFilters) {
    apply({ ...draft, [key]: key === "minPrice" || key === "maxPrice" ? null : key === "discountOnly" ? false : key === "status" ? "all" : key === "sort" ? "featured" : "" });
  }

  return (
    <section className="app-card mb-6 p-4 sm:p-5" aria-label="البحث والفلترة">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
            <SlidersHorizontal size={19} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>بحث وفلترة</h2>
            <p className="mt-0.5 text-[11px] muted">
              {resultCount !== undefined
                ? `${formatCount(resultCount)} ${totalCount !== undefined && totalCount !== resultCount ? `من ${formatCount(totalCount)} ` : ""}نتيجة`
                : "دقّقي البحث أو اختاري فلترًا لتصلي إلى ما تبحثين عنه"}
            </p>
          </div>
        </div>
        {activeCount > 0 && (
          <button type="button" onClick={() => apply(emptyFilters)} className="btn btn-soft px-3 py-1.5 text-[11px]">
            <RotateCcw size={13} />مسح كل الفلاتر
          </button>
        )}
      </div>

      {priceBounds && (
        <div
          className="mb-4 rounded-2xl p-3.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          <PriceRangeSlider
            min={priceBounds.min}
            max={priceBounds.max}
            step={priceStep}
            value={priceValue}
            onCommit={applyPrice}
          />
        </div>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="min-w-[210px] flex-[1_1_260px]">
          <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>كلمة البحث</span>
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-2)" }} />
            <input
              value={draft.q}
              onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
              type="search"
              placeholder="الاسم أو الكود أو الوصف"
              aria-label="كلمة البحث"
              className="field w-full py-2.5 pe-9 text-xs"
            />
          </span>
        </label>

        {colors.length > 0 && (
          <label className="w-full min-w-[140px] flex-[0_1_160px]">
            <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>اللون</span>
            <select
              value={draft.color}
              onChange={(event) => apply({ ...draft, color: event.target.value })}
              className="field w-full py-2.5 text-xs"
              aria-label="فلترة حسب اللون"
            >
              <option value="">كل الألوان</option>
              {colors.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
          </label>
        )}

        {sizes.length > 0 && (
          <label className="w-full min-w-[120px] flex-[0_1_140px]">
            <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>المقاس</span>
            <select
              value={draft.size}
              onChange={(event) => apply({ ...draft, size: event.target.value })}
              className="field w-full py-2.5 text-xs"
              aria-label="فلترة حسب المقاس"
            >
              <option value="">كل المقاسات</option>
              {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        )}

        {!priceBounds && (
          <>
            <label className="w-full min-w-[100px] flex-[0_1_110px]">
              <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>السعر من</span>
              <input
                value={draft.minPrice ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, minPrice: event.target.value === "" ? null : Number(event.target.value) }))}
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="0"
                aria-label="أقل سعر"
                className="field w-full py-2.5 text-xs"
              />
            </label>

            <label className="w-full min-w-[100px] flex-[0_1_110px]">
              <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>السعر إلى</span>
              <input
                value={draft.maxPrice ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, maxPrice: event.target.value === "" ? null : Number(event.target.value) }))}
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="أي سعر"
                aria-label="أعلى سعر"
                className="field w-full py-2.5 text-xs"
              />
            </label>
          </>
        )}

        {statusOptions && (
          <label className="w-full min-w-[130px] flex-[0_1_150px]">
            <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>الحالة</span>
            <select
              value={draft.status}
              onChange={(event) => apply({ ...draft, status: event.target.value })}
              className="field w-full py-2.5 text-xs"
              aria-label="فلترة حسب الحالة"
            >
              {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
        )}

        <label className="w-full min-w-[150px] flex-[0_1_170px]">
          <span className="mb-1.5 block text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>الترتيب</span>
          <select
            value={draft.sort}
            onChange={(event) => apply({ ...draft, sort: event.target.value as CatalogSort })}
            className="field w-full py-2.5 text-xs"
            aria-label="ترتيب النتائج"
          >
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-xl px-3 text-[11px] font-extrabold" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink-soft)" }}>
          <input
            type="checkbox"
            checked={draft.discountOnly}
            onChange={(event) => apply({ ...draft, discountOnly: event.target.checked })}
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--brand)" }}
          />
          مع الخصم فقط
        </label>

        <button type="submit" className="btn btn-primary h-[38px] shrink-0 px-4 text-xs">
          <Search size={14} />بحث
        </button>
      </form>

      {activeCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3" style={{ borderColor: "var(--line)" }}>
          <span className="ms-1 text-[10px] font-extrabold" style={{ color: "var(--muted-2)" }}>الفلاتر النشطة:</span>
          {filters.q && <FilterChip label={`بحث: ${filters.q}`} onRemove={() => clearChip("q")} />}
          {filters.color && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
              style={{ background: colorSwatch(filters.color), color: colorInk(filters.color) }}
            >
              {filters.color}
              <button type="button" onClick={() => clearChip("color")} aria-label="إزالة فلتر اللون"><X size={11} /></button>
            </span>
          )}
          {filters.size && <FilterChip label={`مقاس: ${filters.size}`} onRemove={() => clearChip("size")} />}
          {(filters.minPrice !== null || filters.maxPrice !== null) && (
            <FilterChip
              label={`السعر: ${filters.minPrice ?? 0} – ${filters.maxPrice ?? "أي سعر"}`}
              onRemove={() => apply({ ...draft, minPrice: null, maxPrice: null })}
            />
          )}
          {filters.discountOnly && <FilterChip label="مع الخصم فقط" onRemove={() => clearChip("discountOnly")} />}
          {filters.status !== "all" && (
            <FilterChip label={`الحالة: ${statusOptions?.find((item) => item.value === filters.status)?.label ?? filters.status}`} onRemove={() => clearChip("status")} />
          )}
          {filters.sort !== "featured" && (
            <FilterChip label={sortOptions.find((item) => item.value === filters.sort)?.label ?? filters.sort} onRemove={() => clearChip("sort")} />
          )}
        </div>
      )}
    </section>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
      {label}
      <button type="button" onClick={onRemove} aria-label={`إزالة ${label}`}><X size={11} /></button>
    </span>
  );
}

function formatCount(value: number) {
  return value.toLocaleString("ar-EG");
}
