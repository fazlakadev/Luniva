import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, ensureProductsTables } from "@/lib/db";
import { validateProduct } from "@/lib/products";
import { uploadImage } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureProductsTables();
    const result = await db.query(`SELECT p.id, p.name, p.primary_sku, p.description, p.image_url, p.created_at, p.updated_at,
      COUNT(v.id)::int AS variant_count, MIN(v.price) AS starting_price,
      MIN(v.price_before_discount) AS starting_before_price,
      COALESCE(SUM(v.stock), 0)::int AS total_stock,
      COALESCE(MAX(CASE WHEN v.price_before_discount > v.price AND v.price_before_discount > 0
        THEN ROUND(((v.price_before_discount - v.price) / v.price_before_discount) * 100)::int ELSE 0 END), 0) AS top_discount,
      COALESCE(json_agg(json_build_object(
        'id', v.id, 'color', v.color, 'size', v.size, 'sku', v.sku,
        'price', v.price, 'price_before_discount', v.price_before_discount,
        'discount_type', v.discount_type, 'discount_value', v.discount_value, 'image_url', v.image_url,
        'stock', v.stock, 'min_stock_alert', v.min_stock_alert,
        'supplier_id', v.supplier_id, 'supplier_name', s.name, 'supply_price', v.supply_price
      ) ORDER BY v.color, v.size) FILTER (WHERE v.id IS NOT NULL), '[]') AS variants
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN suppliers s ON s.id = v.supplier_id
      GROUP BY p.id ORDER BY p.created_at DESC`);
    return NextResponse.json({ products: result.rows });
  } catch { return NextResponse.json({ error: "تعذر تحميل المنتجات." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  const client = await db.connect();
  try {
    const formData = await request.formData();
    const product = validateProduct(JSON.parse(String(formData.get("payload") ?? "{}")));
    const imageUrl = await uploadImage(formData.get("productImage"));
    for (const [index, variant] of product.variants.entries()) variant.imageUrl = await uploadImage(formData.get(`variantImage-${index}`)) || variant.imageUrl;
    await ensureProductsTables();
    await client.query("BEGIN");
    const created = await client.query(`INSERT INTO products (name, primary_sku, description, image_url) VALUES ($1, $2, $3, $4)
      RETURNING id, name, primary_sku, description, image_url, created_at, updated_at`, [product.name, product.primarySku, product.description, imageUrl]);
    for (const variant of product.variants) await client.query(
      `INSERT INTO product_variants
        (product_id, color, size, sku, price, price_before_discount, discount_type, discount_value, image_url, supplier_id, supply_price, stock, min_stock_alert)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [created.rows[0].id, variant.color, variant.size, variant.sku, variant.price, variant.beforePrice, variant.discountType, variant.discountValue, variant.imageUrl, variant.supplierId, variant.supplyPrice, variant.stock, variant.minStockAlert],
    );
    await client.query(
      `UPDATE products SET
        price_before_discount = (SELECT MIN(price_before_discount) FROM product_variants WHERE product_id = $1),
        price_after_discount = (SELECT MIN(price) FROM product_variants WHERE product_id = $1),
        updated_at = NOW()
       WHERE id = $1`,
      [created.rows[0].id],
    );
    await client.query("COMMIT");
    return NextResponse.json({ product: created.rows[0] }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    const raw = error instanceof Error ? error.message : "تعذر حفظ المنتج.";
    const message = raw.includes("unique") ? "هذا الكود مستخدم بالفعل." : raw;
    return NextResponse.json({ error: message }, { status: 400 });
  } finally { client.release(); }
}
