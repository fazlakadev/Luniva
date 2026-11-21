import { Metadata } from "next";
import AdminNewsletterHub from "@/components/admin-newsletter-hub";

export const metadata: Metadata = {
  title: "النشرة البريدية | لوحة إدارة لونيفا",
  description: "إدارة المشتركات في النشرة البريدية وإرسال الحملات الإعلانية والخصومات الحصرية.",
};

export const dynamic = "force-dynamic";

export default function NewsletterPage() {
  return (
    <div className="page-enter">
      <div className="mb-7">
        <p className="eyebrow">التسويق والتواصل</p>
        <h1 className="page-title mt-1">النشرة البريدية والمشتركون</h1>
        <p className="page-subtitle mt-2 max-w-xl">
          إدارة قائمة المشتركات اللاتي قمن بالتسجيل من المتجر، تصدير القوائم، وإرسال النشرات البريدية والعروض الحصرية.
        </p>
      </div>

      <AdminNewsletterHub />
    </div>
  );
}
