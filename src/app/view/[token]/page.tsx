import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicInvoiceView, { type PublicInvoiceData } from "@/components/public-invoice-view";
import { type InvoiceDocumentData } from "@/components/invoice-document";
import { getInvoiceDetail } from "@/lib/invoice-queries";
import {
  getPublicInvoiceUrl,
  invoiceQrDataUrl,
  maskPhone,
  verifyInvoiceViewToken,
} from "@/lib/invoice-view";
import {
  deliveryStatusLabels,
  invoiceStatusLabels,
  normalizeDeliveryStatus,
  paymentMethodLabels,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/invoice-shared";
import { getSettings } from "@/lib/settings";

// This page is a signed, read-only share link. It must never be cached or indexed.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "معاينة الفاتورة | لونيفا",
  description: "صفحة آمنة لمعاينة تفاصيل الفاتورة والمنتجات.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, noarchive: true },
  },
};

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoiceId = await verifyInvoiceViewToken(token);
  if (!invoiceId) notFound();

  const [invoice, settings] = await Promise.all([getInvoiceDetail(invoiceId), getSettings()]);
  if (!invoice) notFound();

  const status = (invoice.status as InvoiceStatus) ?? "unpaid";
  const paymentMethod = (invoice.payment_method as PaymentMethod) ?? "cash";
  const deliveryStatus = normalizeDeliveryStatus(invoice.delivery_status) ?? "preparing";
  const discountType = invoice.discount_type === "percent" ? "percent" : "amount";
  const createdAt = isoDate(invoice.created_at) ?? new Date().toISOString();
  const dueDate = isoDate(invoice.due_date);
  const maskedPhone = maskPhone(invoice.customer_phone ? String(invoice.customer_phone) : null);
  const rawItems: Array<Record<string, unknown>> = Array.isArray(invoice.items)
    ? (invoice.items as Array<Record<string, unknown>>)
    : [];

  // The QR uses the existing signed link. Generating a display QR must never
  // rotate the nonce, otherwise previously shared links would stop working.
  const shareUrl = await getPublicInvoiceUrl(invoice.id);
  const qrImage = shareUrl ? await invoiceQrDataUrl(shareUrl) : "";

  const documentItems = rawItems.map((item, index) => {
    const quantity = Number(item.quantity ?? 1);
    const unitBefore = Number(item.unit_before ?? 0);
    return {
      id: `item-${index + 1}`,
      item_type: "product",
      name: String(item.name ?? "منتج"),
      description: item.description ? String(item.description) : null,
      sku: item.sku ? String(item.sku) : null,
      unit_before: unitBefore,
      unit_price: Number(item.unit_price ?? 0),
      quantity,
      line_before: Number(item.line_before ?? unitBefore * quantity),
      line_total: Number(item.line_total ?? 0),
    };
  });

  const document: InvoiceDocumentData = {
    invoice_number: String(invoice.invoice_number ?? ""),
    customer_name: String(invoice.customer_name ?? "عميلتنا"),
    customer_phone: maskedPhone,
    customer_address: null,
    delivery_area: invoice.delivery_area ? String(invoice.delivery_area) : null,
    subtotal: Number(invoice.subtotal ?? 0),
    discount_type: discountType,
    discount_value: Number(invoice.discount_value ?? 0),
    discount_amount: Number(invoice.discount_amount ?? 0),
    delivery_fee: Number(invoice.delivery_fee ?? 0),
    total: Number(invoice.total ?? 0),
    paid_amount: Number(invoice.paid_amount ?? 0),
    status,
    payment_method: paymentMethod,
    notes: invoice.notes ? String(invoice.notes) : null,
    created_at: createdAt,
    due_date: dueDate,
    items: documentItems,
    company: settings,
    qrImage,
    deliveryStatus,
  };

  // Deliberately pass only what the client needs — no ids, no session, no
  // customer record and no full phone number ever cross into this page.
  const data: PublicInvoiceData = {
    invoiceNumber: String(invoice.invoice_number ?? ""),
    customerName: String(invoice.customer_name ?? "عميلتنا"),
    maskedPhone,
    deliveryArea: invoice.delivery_area ? String(invoice.delivery_area) : null,
    createdAt,
    dueDate,
    status,
    statusLabel: invoiceStatusLabels[status] ?? status,
    paymentMethodLabel: paymentMethodLabels[paymentMethod] ?? "نقدًا",
    notes: invoice.notes ? String(invoice.notes) : null,
    items: rawItems.map((item) => ({
      name: String(item.name ?? "منتج"),
      description: item.description ? String(item.description) : null,
      sku: item.sku ? String(item.sku) : null,
      imageUrl: item.image_url ? String(item.image_url) : null,
      unitPrice: Number(item.unit_price ?? 0),
      unitBefore: Number(item.unit_before ?? 0),
      quantity: Number(item.quantity ?? 1),
      lineTotal: Number(item.line_total ?? 0),
    })),
    subtotal: Number(invoice.subtotal ?? 0),
    discountLabel: discountType === "percent" ? "الخصم (نسبة مئوية)" : "الخصم (مبلغ ثابت)",
    discountAmount: Number(invoice.discount_amount ?? 0),
    deliveryFee: Number(invoice.delivery_fee ?? 0),
    total: Number(invoice.total ?? 0),
    paid: Number(invoice.paid_amount ?? 0),
    remaining: Math.max(0, Number(invoice.total ?? 0) - Number(invoice.paid_amount ?? 0)),
    company: {
      name: settings.companyName,
      tagline: settings.companyTagline,
      phone: settings.companyPhone,
      address: settings.companyAddress,
      taxNumber: settings.taxNumber,
      footer: settings.receiptFooter,
    },
    deliveryStatus,
    deliveryStatusLabel: deliveryStatusLabels[deliveryStatus],
    qrImage,
    document,
  };

  return <PublicInvoiceView data={data} />;
}
