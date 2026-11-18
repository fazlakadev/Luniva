import type { Metadata } from "next";
import PublicCatalog from "@/components/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "لونيفا | الرئيسية والكتالوج",
  description: "الصفحة الرئيسية والكتالوج في مكان واحد: منتجات وبكدجات لونيفا بألوان ومقاسات وأسعار نهائية وتفاصيل كاملة.",
};

export default function PublicCatalogPage() {
  return <PublicCatalog page="home" />;
}
