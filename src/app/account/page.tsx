import { Metadata } from "next";
import PublicSiteShell from "@/components/public-site-shell";
import CustomerAccountView from "@/components/customer-account-view";

export const metadata: Metadata = {
  title: "حسابي وطلباتي | Luniva Fashion",
  description: "عرض ملفكِ الشخصي وسجل طلبات الاستفسار والشراء الخاصة بكِ في لونيفا.",
};

export default function AccountPage() {
  return (
    <PublicSiteShell section="about">
      <div className="container-page py-10 sm:py-14">
        <CustomerAccountView />
      </div>
    </PublicSiteShell>
  );
}
