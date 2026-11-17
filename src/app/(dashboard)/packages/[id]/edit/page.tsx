import { notFound } from "next/navigation";
import PackageForm, { type PackageFormInitial } from "@/components/package-form";
import { getPackageDetail } from "@/lib/package-queries";
import type { DiscountType, PackageStatus } from "@/lib/packages";

type SelectionRow = {
  productId: string;
  variantId: string;
};

type VariantRow = {
  name: string;
  sku: string;
  stock: number;
  discount_type: string | null;
  discount_value: string | number | null;
  image_url: string | null;
  selections: SelectionRow[];
};

type ItemRow = {
  product_id: string;
  quantity: number;
};

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = await getPackageDetail(id);
  if (!pkg) notFound();

  const items = (pkg.items ?? []) as ItemRow[];
  const variants = (pkg.variants ?? []) as VariantRow[];

  const initial: PackageFormInitial = {
    id: String(pkg.id),
    name: String(pkg.name ?? ""),
    primary_sku: String(pkg.primary_sku ?? ""),
    description: pkg.description ?? null,
    image_url: pkg.image_url ?? null,
    status: (pkg.status as PackageStatus) ?? "active",
    badge: pkg.badge ?? null,
    items: items.map((item) => ({ productId: item.product_id, quantity: Number(item.quantity) || 1 })),
    variants: variants.map((variant) => ({
      name: variant.name,
      sku: variant.sku,
      stock: Number(variant.stock) || 0,
      discountType: (variant.discount_type as DiscountType) ?? "percent",
      discountValue: Number(variant.discount_value) || 0,
      imageUrl: variant.image_url,
      selections: (variant.selections ?? []).map((selection) => ({
        productId: selection.productId,
        variantId: selection.variantId,
      })),
    })),
  };

  return <PackageForm initial={initial} />;
}
