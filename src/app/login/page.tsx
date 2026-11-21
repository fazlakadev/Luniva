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
    <PublicSiteShell section="about">
      <div className="container-page py-12 sm:py-16">
        <Suspense fallback={<div className="text-center p-12 text-muted">جارِ التحميل…</div>}>
          <CustomerLoginForm />
        </Suspense>
      </div>
    </PublicSiteShell>
  );
}
