/** Shared, dependency-free catalog search/filter primitives for public and admin lists. */

export type CatalogSort =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "discount"
  | "name"
  | "newest";

export type CatalogFilters = {
  q: string;
  color: string;
  size: string;
  minPrice: number | null;
  maxPrice: number | null;
  discountOnly: boolean;
  status: string;
  sort: CatalogSort;
};

export const emptyFilters: CatalogFilters = {
  q: "",
  color: "",
  size: "",
  minPrice: null,
  maxPrice: null,
  discountOnly: false,
  status: "all",
  sort: "featured",
};

type RawParams = Record<string, string | string[] | undefined>;

const SORTS: CatalogSort[] = ["featured", "price-asc", "price-desc", "discount", "name", "newest"];

export function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value)
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٬,\s]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ");
}

export function parseCatalogFilters(params: RawParams): CatalogFilters {
  const sort = firstParam(params.sort) as CatalogSort;
  const discount = firstParam(params.discountOnly);
  return {
    q: firstParam(params.q).trim(),
    color: firstParam(params.color).trim(),
    size: firstParam(params.size).trim(),
    minPrice: toNumber(firstParam(params.minPrice)),
    maxPrice: toNumber(firstParam(params.maxPrice)),
    discountOnly: discount === "1" || discount === "true",
    status: firstParam(params.status).trim() || "all",
    sort: SORTS.includes(sort) ? sort : "featured",
  };
}

export function filtersToQuery(filters: CatalogFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.color) params.set("color", filters.color);
  if (filters.size) params.set("size", filters.size);
  if (filters.minPrice !== null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.discountOnly) params.set("discountOnly", "1");
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  return params.toString();
}

export function activeFilterCount(filters: CatalogFilters) {
  return (
    Number(Boolean(filters.q)) +
    Number(Boolean(filters.color)) +
    Number(Boolean(filters.size)) +
    Number(filters.minPrice !== null) +
    Number(filters.maxPrice !== null) +
    Number(filters.discountOnly) +
    Number(filters.status !== "all") +
    Number(filters.sort !== "featured")
  );
}

export type FilterableItem = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  colors?: string[];
  sizes?: string[];
  price?: number;
  discountPercent?: number;
  status?: string;
  createdAt?: string | number | Date;
  searchText?: string;
};

export function filterAndSortItems<T extends FilterableItem>(items: T[], filters: CatalogFilters): T[] {
  const query = normalizeText(filters.q);
  const color = normalizeText(filters.color);
  const size = normalizeText(filters.size);

  const filtered = items.filter((item) => {
    const haystack = normalizeText(
      [item.name, item.sku, item.description, item.searchText, ...(item.colors ?? []), ...(item.sizes ?? [])].join(" "),
    );
    if (query && !haystack.includes(query)) return false;
    if (color && !(item.colors ?? []).some((value) => normalizeText(value).includes(color))) return false;
    if (size && !(item.sizes ?? []).some((value) => normalizeText(value).includes(size))) return false;
    const price = Number(item.price ?? 0);
    if (filters.minPrice !== null && price < filters.minPrice) return false;
    if (filters.maxPrice !== null && price > filters.maxPrice) return false;
    if (filters.discountOnly && !(Number(item.discountPercent ?? 0) > 0)) return false;
    if (filters.status !== "all" && item.status !== filters.status) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case "price-asc":
      sorted.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
      break;
    case "price-desc":
      sorted.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
      break;
    case "discount":
      sorted.sort((a, b) => Number(b.discountPercent ?? 0) - Number(a.discountPercent ?? 0));
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      break;
    case "newest":
      sorted.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      break;
    default:
      break;
  }
  return sorted;
}

/** Package variants expose colours/sizes through their generated names when no direct columns exist. */
export function variantFacets(variant: { color?: string; size?: string; name?: string }) {
  const parts = String(variant.name ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    colors: [variant.color, parts[0]].filter((value): value is string => Boolean(value)),
    sizes: [variant.size, parts[1]].filter((value): value is string => Boolean(value)),
  };
}
