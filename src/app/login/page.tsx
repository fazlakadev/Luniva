import { Metadata } from "next";
import { Suspense } from "react";
import PublicSiteShell from "@/components/public-site-shell";
import CustomerLoginForm from "@/components/customer-login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول وإنشاء حساب | Luniva Fashion",
  description: "سجلي دخولكِ للاطلاع على تشكيلات لونيفا وإرسال طلبات الحجز والاستفسارات.",
};

export default function LoginPage() {
  return (
    <PublicSiteShell section="contact">
      <div className="container-page pt-28 pb-16 sm:pt-36 sm:pb-24">
        <Suspense fallback={<div className="text-center p-12 text-muted">جارِ التحميل…</div>}>
          <CustomerLoginForm />
        </Suspense>
      </div>
    </PublicSiteShell>
  );
}
