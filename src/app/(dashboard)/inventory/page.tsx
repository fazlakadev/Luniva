import type { Metadata } from "next";
import { getComprehensiveInventoryData } from "@/lib/inventory";
import InventoryDashboard from "@/components/inventory-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المخزون والتحليلات المجمعة | لونيفا",
  description: "لوحة متكاملة لمتابعة أرصدة المنتجات، جاهزية البكدجات، التنبيهات وسجل الحركات.",
};

export default async function InventoryPage() {
  const data = await getComprehensiveInventoryData();

  return <InventoryDashboard initialData={data} />;
}
