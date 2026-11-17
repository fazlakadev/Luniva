import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Pencil, ReceiptText } from "lucide-react";
import InvoiceActions from "@/components/invoice-actions";
import InvoiceDocument, { type InvoiceDocumentData } from "@/components/invoice-document";
import PrintInvoiceButton from "@/components/invoice-print-button";
import InvoiceShareCard from "@/components/invoice-share-card";
import { getInvoiceDetail } from "@/lib/invoice-queries";
import { getPublicInvoiceUrl, invoiceQrDataUrl } from "@/lib/invoice-view";
import { formatDate } from "@/lib/format";
import { invoiceStatusLabels, type InvoiceStatus, type PaymentMethod } from "@/lib/invoices";
import { daysOverdue } from "@/lib/invoice-shared";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const statusStyle: Record<InvoiceStatus, string> = {
  unpaid: "badge-danger",
  partial: "badge-warning",
  paid: "badge-success",
  cancelled: "badge-muted",
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [invoice, settings] = await Promise.all([getInvoiceDetail(id), getSettings()]);
  if (!invoice) notFound();

  const status = invoice.status as InvoiceStatus;
  const paymentMethod = invoice.payment_method as PaymentMethod;
  const discountType = invoice.discount_type === "percent" ? "percent" : "amount";
  const created = query.created === "1";
  const autoPrint = query.print === "1";

  const shareUrl = await getPublicInvoiceUrl(invoice.id);
  const shareQr = shareUrl ? await invoiceQrDataUrl(shareUrl) : "";

  const document: InvoiceDocumentData = {
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name,
    customer_phone: invoice.customer_phone,
    customer_address: invoice.customer_address,
    delivery_area: invoice.delivery_area,
    subtotal: invoice.subtotal,
    discount_type: discountType,
    discount_value: invoice.discount_value,
    discount_amount: invoice.discount_amount,
    delivery_fee: invoice.delivery_fee,
    total: invoice.total,
    paid_amount: invoice.paid_amount,
    status,
    payment_method: paymentMethod,
    notes: invoice.notes,
    created_at: invoice.created_at,
    due_date: invoice.due_date,
    items: invoice.items,
    company: settings,
    qrImage: shareQr || undefined,
  };

  const overdue = daysOverdue(invoice.due_date, status);

  return (
    <div className="page-enter">
      <div className="print-hidden mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link href="/invoices" className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
            <ArrowRight size={13} />كل الفواتير
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="eyebrow">مستند الفاتورة</p>
            <span className={`badge ${statusStyle[status] ?? "badge-muted"}`}>{invoiceStatusLabels[status] ?? status}</span>
            {overdue > 0 && <span className="badge badge-danger">متأخرة {overdue} يوم</span>}
          </div>
          <h1 className="page-title mono mt-1" dir="ltr" style={{ textAlign: "right" }}>{invoice.invoice_number}</h1>
          <p className="page-subtitle mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{invoice.customer_name}</span>
            <span className="inline-flex items-center gap-1 text-[11px]"><CalendarDays size={12} />{formatDate(invoice.created_at)}</span>
            <span className="inline-flex items-center gap-1 text-[11px]"><ReceiptText size={12} />{invoice.items.length} عنصر</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/invoices/${invoice.id}/edit`} className="btn btn-outline"><Pencil size={15} />تعديل الفاتورة</Link>
          <PrintInvoiceButton autoPrint={autoPrint} />
          <Link href="/invoices/new" className="btn btn-soft"><ReceiptText size={15} />فاتورة جديدة</Link>
        </div>
      </div>

      {created && (
        <div className="print-hidden mb-4 rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: "var(--success-soft)", color: "var(--success)", border: "1px solid color-mix(in srgb, var(--success) 26%, transparent)" }}>
          تم إنشاء الفاتورة بنجاح. يمكنك طباعتها أو تسجيل الدفع من لوحة التحصيل.
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <InvoiceDocument invoice={document} />
        </div>
        <div className="print-hidden space-y-4">
          {shareUrl && shareQr && (
            <InvoiceShareCard
              id={invoice.id}
              invoiceNumber={invoice.invoice_number}
              initialUrl={shareUrl}
              initialQr={shareQr}
            />
          )}
          <InvoiceActions
            id={invoice.id}
            invoiceNumber={invoice.invoice_number}
            total={Number(invoice.total)}
            paidAmount={Number(invoice.paid_amount)}
            status={status}
            dueDate={invoice.due_date}
            deliveryFee={Number(invoice.delivery_fee)}
            deliveryArea={invoice.delivery_area ?? ""}
            discountType={discountType}
            discountValue={Number(invoice.discount_value)}
            paymentMethod={paymentMethod}
            notes={invoice.notes ?? ""}
            payments={invoice.payments}
          />
        </div>
      </div>
    </div>
  );
}
