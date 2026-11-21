import { Metadata } from "next";
import PublicSiteShell from "@/components/public-site-shell";
import CartView from "@/components/cart-view";

export const metadata: Metadata = {
  title: "سلة طلبات الحجز والاستفسار | Luniva Fashion",
  description: "راجعي القطع المختارة وأرسلي طلب الاستفسار للتواصل وتأكيد الحجز والتسليم بدون دفع إلكتروني.",
};

export default function CartPage() {
  return (
    <PublicSiteShell section="products">
      <div className="container-page py-10 sm:py-14">
        <CartView />
      </div>
    </PublicSiteShell>
  );
}
