import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "البكدجات | لونيفا",
  description: "توليفات لونيفا الجاهزة من المنتجات بأسعار بعد الخصم، مع عرض المكونات والبكدجات الفرعية والتفاصيل الكاملة.",
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  return <PublicCatalog page="packages" query={query} />;
}
