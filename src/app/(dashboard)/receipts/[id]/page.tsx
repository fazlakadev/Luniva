import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PrintButton from "@/components/print-button";
import ReceiptDocument, { type ReceiptData } from "@/components/receipt-document";
import { getPaymentReceipt } from "@/lib/payments";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [payment, settings] = await Promise.all([getPaymentReceipt(id), getSettings()]);
  if (!payment) notFound();

  return (
    <div className="page-enter">
      <div className="print-hidden mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href={`/invoices/${payment.invoice_id}`} className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
            <ArrowRight size={13} />الفاتورة المرتبطة
          </Link>
          <p className="eyebrow">إيصال دفع</p>
          <h1 className="page-title mono mt-1" dir="ltr" style={{ textAlign: "right" }}>{payment.receipt_number}</h1>
          <p className="page-subtitle mt-2">إيصال تحصيل قابل للطباعة.</p>
        </div>
        <PrintButton label="طباعة الإيصال" autoPrint={query.print === "1"} />
      </div>
      <ReceiptDocument receipt={payment as ReceiptData} settings={settings} />
    </div>
  );
}
