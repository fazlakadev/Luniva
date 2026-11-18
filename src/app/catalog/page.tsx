import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "لونيفا | الرئيسية",
  description: "دمجت صفحة الكتالوج مع الصفحة الرئيسية؛ سيتم توجيهك إلى الصفحة الرئيسية تلقائيًا.",
};

export default function LegacyCatalogPage() {
  redirect("/");
}
