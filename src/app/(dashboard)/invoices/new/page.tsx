import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import InvoiceBuilder, {
  type BuilderCustomer,
  type BuilderPackage,
  type BuilderProduct,
} from "@/components/invoice-builder";
import { getInvoiceFormData } from "@/lib/invoice-queries";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const data = await getInvoiceFormData();

  return (
    <div className="page-enter">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href="/invoices" className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
            <ArrowRight size={13} />رجوع إلى الفواتير
          </Link>
          <p className="eyebrow">فواتير لونيفا</p>
          <h1 className="page-title mt-1">فاتورة جديدة</h1>
          <p className="page-subtitle mt-2 max-w-xl">
            اختاري العميلة والمنتجات أو البكدجات، وحددي الخصم والتوصيل والدفع — الأسعار تُثبَّت من قاعدة البيانات لحظة الحفظ.
          </p>
        </div>
        <span className="badge badge-brand self-start sm:self-auto"><ReceiptText size={12} />إنشاء فاتورة</span>
      </div>

      <InvoiceBuilder
        customers={data.customers as BuilderCustomer[]}
        products={data.products as BuilderProduct[]}
        packages={data.packages as BuilderPackage[]}
        initialProductVariantId={read("productVariant")}
        initialPackageVariantId={read("packageVariant")}
        initialPackageId={read("package")}
        initialCustomerId={read("customer")}
      />
    </div>
  );
}
