import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "لونيفا | المنتجات والبكدجات",
  description: "تصفّحي تشكيلة لونيفا من المنتجات والبكدجات، بأسعار واضحة وتفاصيل كاملة في دليل عرض عام.",
};

export default function PublicCatalogPage() {
  return <PublicCatalog page="home" />;
}
