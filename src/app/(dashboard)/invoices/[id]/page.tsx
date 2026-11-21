import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, CalendarDays, Pencil, Plus, ReceiptText, Truck } from "lucide-react";
import DeliveryStatusControl from "@/components/delivery-status-control";
import InvoiceActions from "@/components/invoice-actions";
import InvoiceCta from "@/components/invoice-cta";
import InvoiceDocument, { type InvoiceDocumentData } from "@/components/invoice-document";
import PrintInvoiceButton from "@/components/invoice-print-button";
import InvoiceShareCard from "@/components/invoice-share-card";
import { getInvoiceAppointments } from "@/lib/appointments";
import {
  appointmentKindLabels,
  appointmentStatusClass,
  appointmentStatusLabels,
} from "@/lib/appointment-shared";
import { getInvoiceDetail } from "@/lib/invoice-queries";
import { getPublicInvoiceUrl, invoiceQrDataUrl } from "@/lib/invoice-view";
import { formatDate } from "@/lib/format";
import { invoiceStatusLabels, type InvoiceStatus, type PaymentMethod } from "@/lib/invoices";
import {
  daysOverdue,
  deliveryStatusLabels,
  normalizeDeliveryStatus,
} from "@/lib/invoice-shared";
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
  const [invoice, settings, appointments] = await Promise.all([
    getInvoiceDetail(id),
    getSettings(),
    getInvoiceAppointments(id, 3),
  ]);
  if (!invoice) notFound();

  const status = invoice.status as InvoiceStatus;
  const paymentMethod = invoice.payment_method as PaymentMethod;
  const deliveryStatus = normalizeDeliveryStatus(invoice.delivery_status) ?? "preparing";
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
    deliveryStatus,
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
            <span className="badge badge-brand"><Truck size={12} />{deliveryStatusLabels[deliveryStatus]}</span>
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
          <InvoiceCta href="/invoices/new" label="فاتورة جديدة" variant="compact" />
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
          <section className="app-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  <CalendarClock size={16} />
                </span>
                <h2 className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>مواعيد الفاتورة</h2>
              </div>
              <Link href={`/appointments?invoice=${invoice.id}`} className="badge badge-brand text-[9px]">
                <Plus size={10} />موعد
              </Link>
            </div>
            {appointments.length === 0 ? (
              <p className="mt-3 text-[11px] leading-6" style={{ color: "var(--muted)" }}>
                لا توجد متابعات مجدولة لهذه الفاتورة.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="rounded-xl px-2.5 py-2"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-extrabold" style={{ color: "var(--ink)" }}>{appointment.title}</p>
                      <span className={`badge ${appointmentStatusClass[appointment.status]} text-[9px]`}>
                        {appointmentStatusLabels[appointment.status]}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: "var(--muted-2)" }}>
                      <CalendarDays size={11} />
                      {formatDate(appointment.appointment_date)}
                      {appointment.appointment_time && <span dir="ltr">· {appointment.appointment_time}</span>}
                      <span className="badge badge-muted text-[9px]">{appointmentKindLabels[appointment.kind]}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <DeliveryStatusControl
            id={invoice.id}
            invoiceNumber={invoice.invoice_number}
            initialStatus={deliveryStatus}
          />
          {shareUrl && shareQr && (
            <InvoiceShareCard
              id={invoice.id}
              invoiceNumber={invoice.invoice_number}
              initialUrl={shareUrl}
              initialQr={shareQr}
              customerName={invoice.customer_name}
              customerPhone={invoice.customer_phone}
              total={Number(invoice.total)}
              remaining={Math.max(0, Number(invoice.total) - Number(invoice.paid_amount))}
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
