import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";
import InvoiceBuilder, {
  type BuilderCustomer,
  type BuilderPackage,
  type BuilderProduct,
  type CartItem,
} from "@/components/invoice-builder";
import { getInvoiceDetail, getInvoiceFormData } from "@/lib/invoice-queries";
import { discountTypeLabels } from "@/lib/packages";
import { invoiceStatusLabels, type InvoiceStatus, type PaymentMethod } from "@/lib/invoice-shared";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, data] = await Promise.all([getInvoiceDetail(id), getInvoiceFormData()]);
  if (!invoice) notFound();

  const cart: CartItem[] = invoice.items.map((item: Record<string, unknown>) => {
    const productVariantId = item.product_variant_id ? String(item.product_variant_id) : null;
    const packageVariantId = item.package_variant_id ? String(item.package_variant_id) : null;
    const product = (data.products as BuilderProduct[]).find((p) => p.variants?.some((v) => v.id === productVariantId));
    const variant = product?.variants?.find((v) => v.id === productVariantId);
    const pkg = (data.packages as BuilderPackage[]).find((p) => p.variants?.some((v) => v.id === packageVariantId));
    const pkgVariant = pkg?.variants?.find((v) => v.id === packageVariantId);
    const currentQty = Number(item.quantity ?? 1);
    const availableStock = (variant?.stock ?? pkgVariant?.stock ?? 0) + (invoice.status !== "cancelled" ? currentQty : 0);

    return {
      key: productVariantId ? `p:${productVariantId}` : `pk:${packageVariantId}`,
      type: item.item_type === "package" ? "package" : "product",
      variantId: productVariantId,
      packageVariantId,
      name: String(item.name ?? ""),
      subtitle: String(item.description ?? ""),
      sku: item.sku ? String(item.sku) : "",
      imageUrl: item.image_url ? String(item.image_url) : null,
      unitPrice: Number(item.unit_price ?? 0),
      unitBefore: Number(item.unit_before ?? 0),
      quantity: currentQty,
      stock: availableStock,
    };
  });

  const status = invoice.status as InvoiceStatus;

  return (
    <div className="page-enter">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href={`/invoices/${invoice.id}`} className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
            <ArrowRight size={13} />رجوع إلى الفاتورة
          </Link>
          <p className="eyebrow">تعديل الفاتورة</p>
          <h1 className="page-title mono mt-1" dir="ltr" style={{ textAlign: "right" }}>{invoice.invoice_number}</h1>
          <p className="page-subtitle mt-2 max-w-xl">
            عدّلي بيانات الفاتورة كما تريدين؛ سيتم إعادة حساب الأسعار والإجمالي من قاعدة البيانات، مع الحفاظ على ما تم تحصيله فعليًا.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <span className={`badge ${status === "cancelled" ? "badge-muted" : "badge-brand"}`}>
            {invoiceStatusLabels[status] ?? status}
          </span>
          <span className="badge badge-lav">{discountTypeLabels[invoice.discount_type === "percent" ? "percent" : "amount"]}</span>
        </div>
      </div>

      <InvoiceBuilder
        customers={data.customers as BuilderCustomer[]}
        products={data.products as BuilderProduct[]}
        packages={data.packages as BuilderPackage[]}
        invoiceId={invoice.id}
        initialCart={cart}
        currentPaid={Number(invoice.paid_amount ?? 0)}
        initialValues={{
          customerId: invoice.customer_id,
          customerName: invoice.customer_name,
          customerPhone: invoice.customer_phone ?? "",
          customerAddress: invoice.customer_address ?? "",
          deliveryArea: invoice.delivery_area ?? "",
          deliveryFee: Number(invoice.delivery_fee ?? 0),
          discountType: invoice.discount_type === "percent" ? "percent" : "amount",
          discountValue: Number(invoice.discount_value ?? 0),
          dueDate: invoice.due_date ?? "",
          notes: invoice.notes ?? "",
          paymentMethod: (invoice.payment_method as PaymentMethod) ?? "cash",
        }}
      />

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px]" style={{ color: "var(--muted-2)" }}>
        <Pencil size={12} />أي تعديل على العناصر يُحدَّث نسخة الفاتورة والرابط العام للعميلة فورًا.
      </p>
    </div>
  );
}
