import type { PoolClient } from "pg";
import { db, ensureInventoryTables } from "@/lib/db";
import { canonicalColorName } from "@/lib/colors";
import type { ResolvedInvoiceItem } from "@/lib/invoices";
import {
  type InventoryTransactionType,
  type ComprehensiveInventoryData,
  inventoryTransactionLabels,
} from "@/lib/inventory-types";

export {
  type InventoryTransactionType,
  type ComprehensiveInventoryData,
  inventoryTransactionLabels,
};

export type VariantDeduction = {
  productVariantId: string;
  productId: string;
  quantity: number;
  reason: string;
};

/**
 * Resolves all product variant quantities that need to be deducted/restored
 * for a list of invoice items (unpacking packages into their constituent variants).
 */
export async function resolveInventoryMovements(
  items: Array<{
    itemType: "product" | "package";
    productVariantId: string | null;
    productId: string | null;
    packageVariantId: string | null;
    quantity: number;
    name?: string;
  }>,
  client?: PoolClient,
): Promise<VariantDeduction[]> {
  const runner = client ?? db;
  const directItems = items.filter((item) => item.itemType === "product" && item.productVariantId);
  const packageItems = items.filter((item) => item.itemType === "package" && item.packageVariantId);

  const deductions: VariantDeduction[] = [];

  for (const item of directItems) {
    deductions.push({
      productVariantId: item.productVariantId!,
      productId: item.productId!,
      quantity: item.quantity,
      reason: item.name ? `منتج: ${item.name}` : "منتج مباشر",
    });
  }

  if (packageItems.length > 0) {
    const packageVariantIds = Array.from(new Set(packageItems.map((p) => p.packageVariantId!)));
    const componentsResult = await runner.query(
      `SELECT pvi.package_variant_id, pvi.product_variant_id, pvi.product_id, pvi.quantity,
              pr.name AS product_name, pv.color, pv.size, pv.sku
       FROM package_variant_items pvi
       JOIN products pr ON pr.id = pvi.product_id
       JOIN product_variants pv ON pv.id = pvi.product_variant_id
       WHERE pvi.package_variant_id = ANY($1::uuid[])`,
      [packageVariantIds],
    );

    const componentsByPkgVariant = new Map<string, typeof componentsResult.rows>();
    for (const row of componentsResult.rows) {
      const list = componentsByPkgVariant.get(row.package_variant_id) ?? [];
      list.push(row);
      componentsByPkgVariant.set(row.package_variant_id, list);
    }

    for (const pkgItem of packageItems) {
      const components = componentsByPkgVariant.get(pkgItem.packageVariantId!) ?? [];
      for (const comp of components) {
        deductions.push({
          productVariantId: comp.product_variant_id,
          productId: comp.product_id,
          quantity: pkgItem.quantity * Number(comp.quantity || 1),
          reason: `بكدج (${pkgItem.name ?? "بكدج"}): ${comp.product_name} (${canonicalColorName(comp.color)} / ${comp.size}) ×${pkgItem.quantity * Number(comp.quantity || 1)}`,
        });
      }
    }
  }

  // Aggregate by productVariantId
  const aggregated = new Map<string, VariantDeduction>();
  for (const item of deductions) {
    const existing = aggregated.get(item.productVariantId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.reason += `، ${item.reason}`;
    } else {
      aggregated.set(item.productVariantId, { ...item });
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Deducts inventory inside a database transaction when an invoice is created or activated.
 */
export async function deductInvoiceInventory(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  items: ResolvedInvoiceItem[],
  actor?: string,
) {
  await ensureInventoryTables();
  const deductions = await resolveInventoryMovements(items, client);
  if (deductions.length === 0) return;

  const variantIds = deductions.map((d) => d.productVariantId);

  // Lock rows FOR UPDATE
  const locked = await client.query(
    `SELECT pv.id, pv.product_id, pv.color, pv.size, pv.sku, pv.stock, pv.min_stock_alert,
            p.name AS product_name
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ANY($1::uuid[])
     FOR UPDATE`,
    [variantIds],
  );

  const lockedMap = new Map(locked.rows.map((row) => [row.id, row]));

  for (const deduction of deductions) {
    const variant = lockedMap.get(deduction.productVariantId);
    if (!variant) {
      throw new Error(`أحد المنتجات غير موجود بالمخزون.`);
    }

    const currentStock = Number(variant.stock || 0);
    const needed = deduction.quantity;

    if (currentStock < needed) {
      const name = `${variant.product_name} (${canonicalColorName(variant.color)} - ${variant.size})`;
      throw new Error(
        `المخزون غير كافٍ لـ «${name}». المتوفر بالمخزون: ${currentStock} قطعة فقط، والمطلوب بالفاتورة: ${needed} قطعة.`,
      );
    }

    const newStock = currentStock - needed;

    await client.query("UPDATE product_variants SET stock = $1 WHERE id = $2", [newStock, variant.id]);

    await client.query(
      `INSERT INTO inventory_transactions
        (product_id, product_variant_id, change_qty, previous_stock, new_stock, type, reference_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'invoice_deduction', $6, $7, $8)`,
      [
        variant.product_id,
        variant.id,
        -needed,
        currentStock,
        newStock,
        invoiceNumber,
        `خصم لفاتورة رقم ${invoiceNumber} (${deduction.reason})`,
        actor ?? null,
      ],
    );
  }
}

/**
 * Restores inventory when an invoice is cancelled or deleted.
 */
export async function restoreInvoiceInventory(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  actor?: string,
) {
  await ensureInventoryTables();

  const itemsResult = await client.query(
    `SELECT item_type, product_id, product_variant_id, package_id, package_variant_id, quantity, name
     FROM invoice_items
     WHERE invoice_id = $1`,
    [invoiceId],
  );

  const items = itemsResult.rows.map((row) => ({
    itemType: row.item_type as "product" | "package",
    productId: row.product_id,
    productVariantId: row.product_variant_id,
    packageVariantId: row.package_variant_id,
    quantity: Number(row.quantity || 1),
    name: row.name,
  }));

  const restorations = await resolveInventoryMovements(items, client);
  if (restorations.length === 0) return;

  const variantIds = restorations.map((r) => r.productVariantId);

  const locked = await client.query(
    `SELECT pv.id, pv.product_id, pv.color, pv.size, pv.sku, pv.stock, p.name AS product_name
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ANY($1::uuid[])
     FOR UPDATE`,
    [variantIds],
  );

  const lockedMap = new Map(locked.rows.map((row) => [row.id, row]));

  for (const restoration of restorations) {
    const variant = lockedMap.get(restoration.productVariantId);
    if (!variant) continue;

    const currentStock = Number(variant.stock || 0);
    const returned = restoration.quantity;
    const newStock = currentStock + returned;

    await client.query("UPDATE product_variants SET stock = $1 WHERE id = $2", [newStock, variant.id]);

    await client.query(
      `INSERT INTO inventory_transactions
        (product_id, product_variant_id, change_qty, previous_stock, new_stock, type, reference_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'invoice_restore', $6, $7, $8)`,
      [
        variant.product_id,
        variant.id,
        returned,
        currentStock,
        newStock,
        invoiceNumber,
        `استرجاع مخزون لإلغاء/حذف الفاتورة رقم ${invoiceNumber}`,
        actor ?? null,
      ],
    );
  }
}

/**
 * Manually adjusts stock for a specific product variant with an audit log entry.
 */
export async function adjustVariantStock(options: {
  variantId: string;
  newStock?: number;
  delta?: number;
  type?: InventoryTransactionType;
  notes?: string;
  actor?: string;
}) {
  await ensureInventoryTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT pv.id, pv.product_id, pv.stock, pv.sku, pv.color, pv.size, p.name AS product_name
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = $1
       FOR UPDATE`,
      [options.variantId],
    );

    const variant = lock.rows[0];
    if (!variant) throw new Error("المتغير غير موجود.");

    const currentStock = Number(variant.stock || 0);
    let targetStock = currentStock;

    if (options.newStock !== undefined) {
      targetStock = Math.max(0, Math.trunc(options.newStock));
    } else if (options.delta !== undefined) {
      targetStock = Math.max(0, currentStock + Math.trunc(options.delta));
    }

    const changeQty = targetStock - currentStock;
    if (changeQty === 0 && options.newStock === undefined) {
      await client.query("ROLLBACK");
      return { variantId: variant.id, stock: currentStock, changed: false };
    }

    await client.query("UPDATE product_variants SET stock = $1 WHERE id = $2", [targetStock, variant.id]);

    const txType: InventoryTransactionType =
      options.type ?? (changeQty >= 0 ? "manual_adjustment" : "damage_or_loss");

    await client.query(
      `INSERT INTO inventory_transactions
        (product_id, product_variant_id, change_qty, previous_stock, new_stock, type, reference_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        variant.product_id,
        variant.id,
        changeQty,
        currentStock,
        targetStock,
        txType,
        null,
        options.notes || (changeQty >= 0 ? "تعديل رصيد المخزون" : "تسوية مخزون"),
        options.actor ?? null,
      ],
    );

    await client.query("COMMIT");
    return {
      variantId: variant.id,
      productName: variant.product_name,
      color: variant.color,
      size: variant.size,
      previousStock: currentStock,
      newStock: targetStock,
      changed: true,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Returns overall inventory statistics across all products and packages.
 */
export async function getInventoryStats() {
  await ensureInventoryTables();
  const result = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM products) AS total_products,
      (SELECT COUNT(*)::int FROM product_variants) AS total_variants,
      (SELECT COALESCE(SUM(stock), 0)::int FROM product_variants) AS total_stock_pieces,
      (SELECT COUNT(*)::int FROM product_variants WHERE stock = 0) AS out_of_stock_count,
      (SELECT COUNT(*)::int FROM product_variants WHERE stock > 0 AND stock <= min_stock_alert) AS low_stock_count,
      (SELECT COUNT(*)::int FROM packages WHERE status = 'active') AS total_packages
  `);
  return result.rows[0];
}

/**
 * Retrieves low stock alerts for the dashboard.
 */
export async function getLowStockAlerts(limit = 20) {
  await ensureInventoryTables();
  const result = await db.query(
    `SELECT pv.id AS variant_id, pv.product_id, p.name AS product_name, p.primary_sku,
            pv.color, pv.size, pv.sku, pv.stock, pv.min_stock_alert, pv.price, pv.image_url,
            p.image_url AS product_image_url
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.stock <= pv.min_stock_alert
     ORDER BY pv.stock ASC, p.name ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/**
 * Retrieves the recent inventory transaction history.
 */
export async function getInventoryTransactions(options?: {
  productId?: string;
  variantId?: string;
  limit?: number;
}) {
  await ensureInventoryTables();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.variantId) {
    params.push(options.variantId);
    conditions.push(`t.product_variant_id = $${params.length}`);
  } else if (options?.productId) {
    params.push(options.productId);
    conditions.push(`t.product_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 50;
  params.push(limit);

  const result = await db.query(
    `SELECT t.*, p.name AS product_name, pv.color, pv.size, pv.sku
     FROM inventory_transactions t
     JOIN products p ON p.id = t.product_id
     JOIN product_variants pv ON pv.id = t.product_variant_id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return result.rows;
}

/**
 * Returns complete aggregate inventory intelligence: financial metrics, variant breakdown,
 * package readiness with bottleneck calculation, low-stock alerts, and recent audit movements.
 */
export async function getComprehensiveInventoryData(): Promise<ComprehensiveInventoryData> {
  await ensureInventoryTables();

  const [
    kpiResult,
    variantsResult,
    packagesResult,
    packageVariantsResult,
    packageItemsResult,
    alerts,
    transactions,
  ] = await Promise.all([
    // Aggregate KPI metrics
    db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM products) AS total_products,
        (SELECT COUNT(*)::int FROM product_variants) AS total_variants,
        (SELECT COALESCE(SUM(stock), 0)::int FROM product_variants) AS total_stock_pieces,
        (SELECT COUNT(*)::int FROM product_variants WHERE stock = 0) AS out_of_stock_count,
        (SELECT COUNT(*)::int FROM product_variants WHERE stock > 0 AND stock <= min_stock_alert) AS low_stock_count,
        (SELECT COUNT(*)::int FROM product_variants WHERE stock > min_stock_alert) AS healthy_stock_count,
        (SELECT COALESCE(SUM(pv.stock * COALESCE(pv.supply_price, 0)), 0)::float FROM product_variants pv) AS total_cost_value,
        (SELECT COALESCE(SUM(pv.stock * COALESCE(pv.price, 0)), 0)::float FROM product_variants pv) AS total_retail_value,
        (SELECT COUNT(*)::int FROM packages WHERE status = 'active') AS total_packages
    `),

    // All product variants with product and supplier details
    db.query(`
      SELECT
        pv.id AS variant_id,
        pv.product_id,
        p.name AS product_name,
        NULL::text AS category,
        p.primary_sku,
        pv.color,
        pv.size,
        pv.sku,
        pv.stock::int AS stock,
        pv.min_stock_alert::int AS min_stock_alert,
        COALESCE(pv.price, 0)::float AS price,
        COALESCE(pv.supply_price, 0)::float AS supply_price,
        s.name AS supplier_name,
        COALESCE(pv.image_url, p.image_url) AS image_url
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN suppliers s ON s.id = pv.supplier_id
      ORDER BY p.name ASC, pv.color ASC, pv.size ASC
    `),

    // Active packages
    db.query(`
      SELECT id, name, primary_sku, status, image_url
      FROM packages
      WHERE status = 'active'
      ORDER BY name ASC
    `),

    // Package variants
    db.query(`
      SELECT pv.id, pv.package_id, pv.name, pv.sku
      FROM package_variants pv
      JOIN packages p ON p.id = pv.package_id
      WHERE p.status = 'active'
      ORDER BY pv.name ASC
    `),

    // Package variant items with current component stock
    db.query(`
      SELECT
        pvi.package_variant_id,
        pvi.quantity::int AS required_qty,
        pr.name AS product_name,
        v.color,
        v.size,
        v.stock::int AS current_stock
      FROM package_variant_items pvi
      JOIN products pr ON pr.id = pvi.product_id
      JOIN product_variants v ON v.id = pvi.product_variant_id
    `),

    // Low stock alerts
    getLowStockAlerts(50),

    // Recent transactions
    getInventoryTransactions({ limit: 50 }),
  ]);

  const kpi = kpiResult.rows[0] || {};
  const totalCost = Number(kpi.total_cost_value || 0);
  const totalRetail = Number(kpi.total_retail_value || 0);

  // Group package variant items by package_variant_id
  const itemsByVariantId = new Map<string, Array<{
    product_name: string;
    color: string;
    size: string;
    required_qty: number;
    current_stock: number;
  }>>();

  for (const row of packageItemsResult.rows) {
    const list = itemsByVariantId.get(row.package_variant_id) ?? [];
    list.push({
      product_name: row.product_name,
      color: row.color,
      size: row.size,
      required_qty: Number(row.required_qty || 1),
      current_stock: Number(row.current_stock || 0),
    });
    itemsByVariantId.set(row.package_variant_id, list);
  }

  // Group package variants by package_id and calculate maximum buildable stock + bottleneck
  const variantsByPackageId = new Map<string, Array<{
    id: string;
    name: string;
    sku: string;
    calculated_stock: number;
    bottleneck: {
      product_name: string;
      color: string;
      size: string;
      current_stock: number;
      required_qty: number;
    } | null;
    components: Array<{
      product_name: string;
      color: string;
      size: string;
      required_qty: number;
      current_stock: number;
    }>;
  }>>();

  for (const pv of packageVariantsResult.rows) {
    const components = itemsByVariantId.get(pv.id) ?? [];
    let minBuildable = Infinity;
    let bottleneckComp: {
      product_name: string;
      color: string;
      size: string;
      current_stock: number;
      required_qty: number;
    } | null = null;

    if (components.length === 0) {
      minBuildable = 0;
    } else {
      for (const comp of components) {
        const canBuild = Math.floor(comp.current_stock / comp.required_qty);
        if (canBuild < minBuildable) {
          minBuildable = canBuild;
          bottleneckComp = comp;
        }
      }
    }

    const calculatedStock = Number.isFinite(minBuildable) ? Math.max(0, minBuildable) : 0;
    const list = variantsByPackageId.get(pv.package_id) ?? [];
    list.push({
      id: pv.id,
      name: pv.name,
      sku: pv.sku,
      calculated_stock: calculatedStock,
      bottleneck: bottleneckComp,
      components,
    });
    variantsByPackageId.set(pv.package_id, list);
  }

  const structuredPackages = packagesResult.rows.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    primary_sku: pkg.primary_sku,
    status: pkg.status,
    image_url: pkg.image_url,
    variants: variantsByPackageId.get(pkg.id) ?? [],
  }));

  return {
    analytics: {
      total_products: Number(kpi.total_products || 0),
      total_variants: Number(kpi.total_variants || 0),
      total_stock_pieces: Number(kpi.total_stock_pieces || 0),
      out_of_stock_count: Number(kpi.out_of_stock_count || 0),
      low_stock_count: Number(kpi.low_stock_count || 0),
      healthy_stock_count: Number(kpi.healthy_stock_count || 0),
      total_cost_value: totalCost,
      total_retail_value: totalRetail,
      potential_profit: Math.max(0, totalRetail - totalCost),
      total_packages: Number(kpi.total_packages || 0),
    },
    variants: variantsResult.rows,
    packages: structuredPackages,
    alerts,
    transactions: transactions as unknown as ComprehensiveInventoryData["transactions"],
  };
}
