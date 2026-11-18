import ProductsList from "@/components/products-list";
import { db, ensureProductsTables } from "@/lib/db";

export default async function ProductsPage() {
  await ensureProductsTables();
  const result = await db.query(`
    SELECT p.id, p.name, p.primary_sku, p.image_url, p.created_at,
      COALESCE((SELECT array_agg(DISTINCT fv.color) FILTER (WHERE fv.color IS NOT NULL) FROM product_variants fv WHERE fv.product_id = p.id), '{}') AS colors,
      COALESCE((SELECT array_agg(DISTINCT fv.size) FILTER (WHERE fv.size IS NOT NULL) FROM product_variants fv WHERE fv.product_id = p.id), '{}') AS sizes,
      COUNT(v.id)::int AS variant_count,
      MIN(v.price) AS starting_price,
      MAX(v.price) AS top_price,
      MIN(v.price_before_discount) AS starting_before_price,
      COALESCE(MAX(CASE WHEN v.price_before_discount > v.price AND v.price_before_discount > 0
        THEN ROUND(((v.price_before_discount - v.price) / v.price_before_discount) * 100)::int ELSE 0 END), 0) AS top_discount
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return <ProductsList products={result.rows} />;
}
