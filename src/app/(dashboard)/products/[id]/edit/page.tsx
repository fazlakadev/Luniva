import { notFound } from "next/navigation";
import ProductForm from "@/components/product-form";
import { db, ensureProductsTables } from "@/lib/db";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureProductsTables();
  const { id } = await params;
  const product = await db.query(
    "SELECT id, name, primary_sku, description, image_url FROM products WHERE id = $1",
    [id],
  );
  if (!product.rowCount) notFound();

  const variants = await db.query(
    `SELECT id, color, size, sku, price, price_before_discount, discount_type, discount_value, image_url
     FROM product_variants WHERE product_id = $1 ORDER BY color, size`,
    [id],
  );

  return <ProductForm product={{ ...product.rows[0], variants: variants.rows }} />;
}
