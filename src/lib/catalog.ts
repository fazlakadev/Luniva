import { db, ensurePackagesTables } from "@/lib/db";

export type CatalogVariant = {
  id: string;
  color?: string;
  size?: string;
  name?: string;
  sku: string;
  price: string | number;
  priceBeforeDiscount: string | number;
  imageUrl: string | null;
  stock?: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  primary_sku: string;
  description: string | null;
  image_url: string | null;
  variants: CatalogVariant[];
};

export type CatalogPackage = {
  id: string;
  name: string;
  primary_sku: string;
  description: string | null;
  image_url: string | null;
  badge: string | null;
  starting_price: string | number;
  top_price: string | number;
  starting_before_price: string | number;
  items_count: number;
  variants_count: number;
  variants: CatalogVariant[];
};

/**
 * Public, read-only catalog data. It deliberately excludes customers, users,
 * invoices and any other private operational records.
 */
export async function getPublicCatalog(): Promise<{
  products: CatalogProduct[];
  packages: CatalogPackage[];
}> {
  // Packages depend on products, so this also creates the product tables.
  await ensurePackagesTables();

  const [productsResult, packagesResult] = await Promise.all([
    db.query(`
      SELECT p.id, p.name, p.primary_sku, p.description, p.image_url,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', v.id,
            'color', v.color,
            'size', v.size,
            'sku', v.sku,
            'price', v.price,
            'priceBeforeDiscount', COALESCE(v.price_before_discount, v.price),
            'imageUrl', v.image_url
          ) ORDER BY v.color, v.size)
          FROM product_variants v WHERE v.product_id = p.id
        ), '[]'::json) AS variants
      FROM products p
      WHERE EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
      ORDER BY p.name
    `),
    db.query(`
      SELECT p.id, p.name, p.primary_sku, p.description, p.image_url, p.badge,
        MIN(v.price_after_discount) AS starting_price,
        MAX(v.price_after_discount) AS top_price,
        MIN(v.price_before_discount) AS starting_before_price,
        COUNT(v.id)::int AS variants_count,
        (SELECT COUNT(*)::int FROM package_items i WHERE i.package_id = p.id) AS items_count,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', v.id,
            'name', v.name,
            'sku', v.sku,
            'price', v.price_after_discount,
            'priceBeforeDiscount', v.price_before_discount,
            'stock', v.stock,
            'imageUrl', v.image_url
          ) ORDER BY v.sort_order, v.created_at)
          FROM package_variants v WHERE v.package_id = p.id
        ), '[]'::json) AS variants
      FROM packages p
      JOIN package_variants v ON v.package_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.name
    `),
  ]);

  return {
    products: productsResult.rows as CatalogProduct[],
    packages: packagesResult.rows as CatalogPackage[],
  };
}

export type PublicCatalogData = {
  products: CatalogProduct[];
  packages: CatalogPackage[];
  loadError: boolean;
};

/** Loads the display-only catalog and keeps page wrappers free of error plumbing. */
export async function loadPublicCatalog(): Promise<PublicCatalogData> {
  try {
    const { products, packages } = await getPublicCatalog();
    return { products, packages, loadError: false };
  } catch (error) {
    console.error("Public catalog failed to load", error);
    return { products: [], packages: [], loadError: true };
  }
}
