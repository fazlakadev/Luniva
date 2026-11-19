import { db, ensureInvoiceTables } from "@/lib/db";
import { isUuid } from "@/lib/suppliers";

export type ProfitFilters = {
  from?: string;
  to?: string;
  supplierId?: string;
  type?: "all" | "product" | "package";
};

const BASE = `
  WITH lines AS (
    SELECT it.*, i.invoice_number, i.customer_name, i.created_at AS invoice_created_at, i.subtotal,
           i.discount_amount, i.total,
           CASE WHEN COALESCE(i.subtotal, 0) > 0 THEN it.line_total / i.subtotal ELSE 0 END AS share
      FROM invoice_items it
      JOIN invoices i ON i.id = it.invoice_id
     WHERE i.status <> 'cancelled'
  ),
  calc AS (
    SELECT lines.*,
           ROUND((line_total - (discount_amount * share))::numeric, 2) AS net_revenue,
           ROUND((COALESCE(unit_cost, 0) * quantity)::numeric, 2) AS cost,
           ROUND((line_total - (discount_amount * share) - COALESCE(unit_cost, 0) * quantity)::numeric, 2) AS profit
      FROM lines
  )
`;

function filterSql(filters: ProfitFilters) {
  const conditions: string[] = [];
  const params: string[] = [];

  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    params.push(filters.from);
    conditions.push(`invoice_created_at >= $${params.length}::date`);
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    params.push(filters.to);
    conditions.push(`invoice_created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (isUuid(filters.supplierId)) {
    params.push(filters.supplierId);
    conditions.push(`supplier_id = $${params.length}::uuid`);
  }
  if (filters.type === "product" || filters.type === "package") {
    params.push(filters.type);
    conditions.push(`item_type = $${params.length}`);
  }

  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function getProfitReport(filters: ProfitFilters = {}) {
  await ensureInvoiceTables();
  const { where, params } = filterSql(filters);

  const [overviewResult, summaryResult, productsResult, suppliersResult, monthlyResult, linesResult] = await Promise.all([
    db.query(`${BASE}
      SELECT COALESCE(SUM(profit), 0) AS all_profit,
             COALESCE(SUM(net_revenue), 0) AS all_revenue,
             COALESCE(SUM(cost), 0) AS all_cost,
             COALESCE(SUM(profit) FILTER (WHERE invoice_created_at >= date_trunc('day', NOW())), 0) AS today_profit,
             COALESCE(SUM(profit) FILTER (WHERE invoice_created_at >= date_trunc('month', NOW())), 0) AS month_profit
        FROM calc`),
    db.query(`${BASE}
      SELECT COUNT(DISTINCT invoice_id)::int AS invoices, COUNT(*)::int AS lines,
             COALESCE(SUM(line_total), 0) AS gross,
             COALESCE(SUM(net_revenue), 0) AS revenue,
             COALESCE(SUM(cost), 0) AS cost,
             COALESCE(SUM(profit), 0) AS profit,
             COALESCE(SUM(quantity), 0)::int AS units
        FROM calc ${where}`, params),
    db.query(`${BASE}
      SELECT item_type, COALESCE(product_id, package_id) AS ref_id, name, sku,
             SUM(quantity)::int AS units, SUM(net_revenue) AS revenue,
             SUM(cost) AS cost, SUM(profit) AS profit,
             COUNT(DISTINCT invoice_id)::int AS orders
        FROM calc ${where}
       GROUP BY item_type, COALESCE(product_id, package_id), name, sku
       ORDER BY profit DESC LIMIT 12`, params),
    db.query(`${BASE}
      SELECT f.supplier_id, COALESCE(s.name, 'بدون مورد') AS supplier_name,
             COUNT(*)::int AS lines, SUM(f.quantity)::int AS units,
             SUM(f.net_revenue) AS revenue, SUM(f.cost) AS cost, SUM(f.profit) AS profit
        FROM (SELECT * FROM calc ${where}) f
        LEFT JOIN suppliers s ON s.id = f.supplier_id
       GROUP BY f.supplier_id, COALESCE(s.name, 'بدون مورد')
       ORDER BY profit DESC`, params),
    db.query(`${BASE}
      SELECT to_char(invoice_created_at, 'YYYY-MM') AS month,
             SUM(net_revenue) AS revenue, SUM(cost) AS cost, SUM(profit) AS profit
        FROM calc ${where}
       GROUP BY 1 ORDER BY 1 DESC LIMIT 6`, params),
    db.query(`${BASE}
      SELECT invoice_number, customer_name, invoice_created_at AS created_at,
             item_type, name, sku, quantity, unit_price, unit_cost,
             net_revenue, cost, profit
        FROM calc ${where}
       ORDER BY invoice_created_at DESC, sort_order DESC LIMIT 50`, params),
  ]);

  return {
    overview: overviewResult.rows[0] ?? {},
    summary: summaryResult.rows[0] ?? {},
    products: productsResult.rows,
    suppliers: suppliersResult.rows,
    monthly: monthlyResult.rows.reverse(),
    lines: linesResult.rows,
  };
}

export async function exportProfitRows(filters: ProfitFilters = {}) {
  await ensureInvoiceTables();
  const { where, params } = filterSql(filters);
  const result = await db.query(`${BASE}
    SELECT to_char(invoice_created_at, 'YYYY-MM-DD') AS "التاريخ",
           invoice_number AS "رقم الفاتورة", customer_name AS "العميلة",
           CASE WHEN item_type = 'package' THEN 'بكدج' ELSE 'منتج' END AS "النوع",
           name AS "الصنف", sku AS "الكود", quantity AS "الكمية",
           ROUND(unit_price::numeric, 2) AS "سعر البيع",
           ROUND(unit_cost::numeric, 2) AS "سعر التوريد",
           net_revenue AS "المبيعات بعد الخصم", cost AS "التكلفة", profit AS "الربح"
      FROM calc ${where}
     ORDER BY invoice_created_at DESC`, params);
  return result.rows;
}
