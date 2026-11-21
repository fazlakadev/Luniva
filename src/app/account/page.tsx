import { Metadata } from "next";
import PublicSiteShell from "@/components/public-site-shell";
import CustomerAccountView from "@/components/customer-account-view";

export const metadata: Metadata = {
  title: "حسابي وطلباتي | Luniva Fashion",
  description: "عرض ملفكِ الشخصي وسجل طلبات الاستفسار والشراء الخاصة بكِ في لونيفا.",
};

export default function AccountPage() {
  return (
    <PublicSiteShell section="contact">
      <div className="container-page pt-28 pb-16 sm:pt-36 sm:pb-24">
        <CustomerAccountView />
      </div>
    </PublicSiteShell>
  );
}
