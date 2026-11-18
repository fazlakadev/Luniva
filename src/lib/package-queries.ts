import { db, ensurePackagesTables } from "@/lib/db";

export async function getPackagesList() {
  await ensurePackagesTables();
  const result = await db.query(`
    SELECT p.*,
      (SELECT COUNT(*)::int FROM package_items i WHERE i.package_id = p.id) AS items_count,
      (SELECT COUNT(*)::int FROM package_variants v WHERE v.package_id = p.id) AS variants_count,
      COALESCE((SELECT MIN(v.price_after_discount) FROM package_variants v WHERE v.package_id = p.id), p.price_after_discount) AS starting_price,
      COALESCE((SELECT MAX(v.price_after_discount) FROM package_variants v WHERE v.package_id = p.id), p.price_after_discount) AS top_price,
      COALESCE((SELECT MIN(v.price_before_discount) FROM package_variants v WHERE v.package_id = p.id), p.price_before_discount) AS starting_before_price,
      COALESCE((SELECT SUM(v.stock)::int FROM package_variants v WHERE v.package_id = p.id), 0) AS stock_total,
      COALESCE((SELECT array_agg(DISTINCT fv.color) FILTER (WHERE fv.color IS NOT NULL)
        FROM package_variants pv
        JOIN package_variant_items psi ON psi.package_variant_id = pv.id
        JOIN product_variants fv ON fv.id = psi.product_variant_id
        WHERE pv.package_id = p.id), '{}') AS colors,
      COALESCE((SELECT array_agg(DISTINCT fv.size) FILTER (WHERE fv.size IS NOT NULL)
        FROM package_variants pv
        JOIN package_variant_items psi ON psi.package_variant_id = pv.id
        JOIN product_variants fv ON fv.id = psi.product_variant_id
        WHERE pv.package_id = p.id), '{}') AS sizes
    FROM packages p
    ORDER BY p.created_at DESC
  `);
  return result.rows;
}

export async function getPackageDetail(id: string) {
  await ensurePackagesTables();
  const packageResult = await db.query("SELECT * FROM packages WHERE id = $1", [id]);
  const pkg = packageResult.rows[0];
  if (!pkg) return null;

  const items = await db.query(
    `SELECT i.*, p.name AS product_name, p.primary_sku, p.image_url,
      (SELECT COUNT(*)::int FROM product_variants v WHERE v.product_id = p.id) AS variant_count
     FROM package_items i
     JOIN products p ON p.id = i.product_id
     WHERE i.package_id = $1
     ORDER BY i.sort_order`,
    [id],
  );

  const variants = await db.query(
    `SELECT v.*, COALESCE((
        SELECT json_agg(json_build_object(
          'id', s.id,
          'productId', s.product_id,
          'productName', p.name,
          'variantId', s.product_variant_id,
          'color', pv.color,
          'size', pv.size,
          'sku', pv.sku,
          'quantity', s.quantity,
          'unitPrice', s.unit_price,
          'imageUrl', pv.image_url
        ) ORDER BY s.created_at)
        FROM package_variant_items s
        JOIN products p ON p.id = s.product_id
        JOIN product_variants pv ON pv.id = s.product_variant_id
        WHERE s.package_variant_id = v.id
      ), '[]'::json) AS selections
     FROM package_variants v
     WHERE v.package_id = $1
     ORDER BY v.sort_order, v.created_at`,
    [id],
  );

  return { ...pkg, items: items.rows, variants: variants.rows };
}
