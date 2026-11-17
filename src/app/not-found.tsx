import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

export default function NotFound() {
  return (
    <main dir="rtl" className="grid min-h-screen place-items-center overflow-hidden p-4" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="app-card w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <ReceiptText size={30} />
        </span>
        <p className="eyebrow mt-5">لونيفا · تأسست عام 2026</p>
        <h1 className="page-title mt-2">الصفحة غير موجودة</h1>
        <p className="page-subtitle mx-auto mt-3 max-w-xs">
          الرابط غير صالح أو انتهت صلاحيته. اطلبي رابطًا جديدًا من الفاتورة أو عودي إلى الكتالوج.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          <ArrowRight size={16} />العودة إلى الكتالوج
        </Link>
      </div>
    </main>
  );
}
