import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "كتالوج العملاء | لونيفا",
  description: "دليل عرض عام للمنتجات والبكدجات لدى لونيفا، بالألوان والمقاسات والأسعار النهائية بعد الخصم.",
};

export default function CustomerCatalogPage() {
  return <PublicCatalog page="catalog" />;
}
