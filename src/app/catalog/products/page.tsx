import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المنتجات | لونيفا",
  description: "تصفّحي كل منتجات لونيفا بالألوان والمقاسات والأسعار النهائية بعد الخصم، مع تفاصيل كاملة لكل قطعة.",
};

export default function ProductsPage() {
  return <PublicCatalog page="products" />;
}
