import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Pencil } from "lucide-react";
import DeleteButton from "@/components/delete-button";
import ProductShowcase, {
  type ShowcaseProduct,
  type ShowcaseVariant,
} from "@/components/product-showcase";
import { db, ensureProductsTables } from "@/lib/db";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureProductsTables();
  const { id } = await params;

  const result = await db.query(
    "SELECT id, name, primary_sku, description, image_url, created_at FROM products WHERE id = $1",
    [id],
  );
  const product = result.rows[0] as ShowcaseProduct | undefined;
  if (!product) notFound();

  const variantsResult = await db.query(
    `SELECT id, color, size, sku, price, price_before_discount, discount_type, discount_value, image_url
     FROM product_variants WHERE product_id = $1 ORDER BY color, size`,
    [id],
  );
  const variants = variantsResult.rows as ShowcaseVariant[];

  return (
    <>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Link
          href="/products"
          className="inline-flex w-fit items-center gap-1 rounded-xl px-1 py-1 text-xs font-extrabold transition hover:gap-2"
          style={{ color: "var(--lav-strong)" }}
        >
          <ChevronRight size={16} />كل المنتجات
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/products/${id}/edit`} className="btn btn-soft"><Pencil size={16} />تعديل المنتج</Link>
          <DeleteButton endpoint={`/api/products/${id}`} returnTo="/products" label="المنتج" />
        </div>
      </div>

      <ProductShowcase product={product} variants={variants} />
    </>
  );
}
