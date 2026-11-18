import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";
import { parseCatalogFilters } from "@/lib/catalog-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المنتجات | لونيفا",
  description: "تصفّحي كل منتجات لونيفا بالألوان والمقاسات والأسعار النهائية بعد الخصم، مع تفاصيل كاملة لكل قطعة.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseCatalogFilters(await searchParams);
  return <PublicCatalog page="products" filters={filters} />;
}
