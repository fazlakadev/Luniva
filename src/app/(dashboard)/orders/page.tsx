import { Metadata } from "next";
import { listCustomerOrders } from "@/lib/orders";
import AdminOrdersHub from "@/components/admin-orders-hub";

export const metadata: Metadata = {
  title: "طلبات واستفسارات الشراء | Luniva",
  description: "إدارة ومتابعة طلبات واستفسارات الشراء للعميلات بدون دفع إلكتروني.",
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listCustomerOrders();

  return (
    <div className="space-y-6">
      <AdminOrdersHub initialOrders={orders} />
    </div>
  );
}
