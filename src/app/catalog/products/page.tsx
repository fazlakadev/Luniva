import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المنتجات | لونيفا",
  description: "تصفّحي كل منتجات لونيفا بالألوان والمقاسات والأسعار النهائية بعد الخصم، مع تفاصيل كاملة لكل قطعة.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  return <PublicCatalog page="products" query={query} />;
}
