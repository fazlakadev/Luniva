import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "البكدجات | لونيفا",
  description: "توليفات لونيفا الجاهزة من المنتجات بأسعار بعد الخصم، مع عرض المكونات والبكدجات الفرعية والتفاصيل الكاملة.",
};

export default function PackagesPage() {
  return <PublicCatalog page="packages" />;
}
