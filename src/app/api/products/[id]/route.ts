import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureProductsTables } from "@/lib/db";
import { validateProduct } from "@/lib/products";
import { uploadImage } from "@/lib/upload";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  await ensureProductsTables(); const { id } = await params;
  const product = await db.query("SELECT id, name, primary_sku, description, image_url, created_at, updated_at FROM products WHERE id = $1", [id]);
  if (!product.rowCount) return NextResponse.json({ error: "المنتج غير موجود." }, { status: 404 });
  const variants = await db.query("SELECT id, color, size, sku, price, price_before_discount, discount_type, discount_value, image_url, created_at FROM product_variants WHERE product_id = $1 ORDER BY color, size", [id]);
  return NextResponse.json({ product: { ...product.rows[0], variants: variants.rows } });
}

export async function PATCH(request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  const client = await db.connect();
  try {
    const { id } = await params; const formData = await request.formData(); const product = validateProduct(JSON.parse(String(formData.get("payload") ?? "{}"))); const imageUrl = await uploadImage(formData.get("productImage")); for (const [index, variant] of product.variants.entries()) variant.imageUrl = await uploadImage(formData.get(`variantImage-${index}`)) || variant.imageUrl; await ensureProductsTables();
    await client.query("BEGIN");
    const updated = await client.query(`UPDATE products SET name = $1, primary_sku = $2, description = $3, image_url = COALESCE($4, image_url), updated_at = NOW()
      WHERE id = $5 RETURNING id, name, primary_sku, description, image_url, created_at, updated_at`, [product.name, product.primarySku, product.description, imageUrl, id]);
    if (!updated.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "المنتج غير موجود." }, { status: 404 }); }
    await client.query("DELETE FROM product_variants WHERE product_id = $1", [id]);
    for (const variant of product.variants) await client.query("INSERT INTO product_variants (product_id, color, size, sku, price, price_before_discount, discount_type, discount_value, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [id, variant.color, variant.size, variant.sku, variant.price, variant.beforePrice, variant.discountType, variant.discountValue, variant.imageUrl]);
    await client.query(
      `UPDATE products SET
        price_before_discount = (SELECT MIN(price_before_discount) FROM product_variants WHERE product_id = $1),
        price_after_discount = (SELECT MIN(price) FROM product_variants WHERE product_id = $1),
        updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
    await client.query("COMMIT");
    return NextResponse.json({ product: updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    const raw = error instanceof Error ? error.message : "تعذر تعديل المنتج.";
    return NextResponse.json({ error: raw.includes("unique") ? "هذا الكود مستخدم بالفعل." : raw }, { status: 400 });
  } finally { client.release(); }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  await ensureProductsTables(); const { id } = await params;
  const deleted = await db.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  if (!deleted.rowCount) return NextResponse.json({ error: "المنتج غير موجود." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
