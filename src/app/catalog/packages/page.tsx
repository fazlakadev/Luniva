import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";
import { parseCatalogFilters } from "@/lib/catalog-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "البكدجات | لونيفا",
  description: "توليفات لونيفا الجاهزة من المنتجات بأسعار بعد الخصم، مع عرض المكونات والبكدجات الفرعية والتفاصيل الكاملة.",
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseCatalogFilters(await searchParams);
  return <PublicCatalog page="packages" filters={filters} />;
}
