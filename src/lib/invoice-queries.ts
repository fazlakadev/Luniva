import { db, ensureInvoiceTables } from "@/lib/db";

/**
 * `pg` hydrates DATE columns as JS Date objects, but the UI and the API expect
 * a plain `yyyy-mm-dd` string. Format in local time so the day never shifts.
 */
function isoDateOnly(value: unknown) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getInvoicesList(customerId?: string | null) {
  await ensureInvoiceTables();
  const filter = customerId ? "WHERE i.customer_id = $1" : "";
  const params = customerId ? [customerId] : [];
  const result = await db.query(
    `SELECT i.*,
       (SELECT COUNT(*)::int FROM invoice_items it WHERE it.invoice_id = i.id) AS items_count,
       (SELECT COALESCE(SUM(it.quantity), 0)::int FROM invoice_items it WHERE it.invoice_id = i.id) AS units_count,
       (SELECT COALESCE(json_agg(it.name ORDER BY it.sort_order), '[]'::json)
          FROM invoice_items it WHERE it.invoice_id = i.id) AS item_names,
       (SELECT COUNT(*)::int FROM invoice_payments p WHERE p.invoice_id = i.id) AS payments_count,
       GREATEST(i.total - i.paid_amount, 0) AS remaining,
       CASE WHEN i.status IN ('unpaid', 'partial') AND i.due_date < CURRENT_DATE
            THEN (CURRENT_DATE - i.due_date) ELSE 0 END AS overdue_days
     FROM invoices i
     ${filter}
     ORDER BY i.created_at DESC`,
    params,
  );
  return result.rows;
}

export async function getInvoiceStats() {
  await ensureInvoiceTables();
  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS invoices,
      COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled'), 0) AS billed,
      COALESCE(SUM(paid_amount) FILTER (WHERE status <> 'cancelled'), 0) AS collected,
      COALESCE(SUM(GREATEST(total - paid_amount, 0)) FILTER (WHERE status <> 'cancelled'), 0) AS outstanding,
      COUNT(*) FILTER (WHERE status = 'unpaid')::int AS unpaid,
      COUNT(*) FILTER (WHERE status = 'partial')::int AS partial,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()))::int AS today_count,
      COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE)::int AS overdue,
      COALESCE(SUM(GREATEST(total - paid_amount, 0))
        FILTER (WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE), 0) AS overdue_amount,
      (SELECT COALESCE(SUM(amount), 0) FROM invoice_payments p
         JOIN invoices i ON i.id = p.invoice_id
        WHERE p.paid_at >= date_trunc('day', NOW()) AND i.status <> 'cancelled') AS today_collected
    FROM invoices
  `);
  return result.rows[0];
}

export async function getInvoiceDetail(id: string) {
  await ensureInvoiceTables();
  const invoiceResult = await db.query("SELECT * FROM invoices WHERE id = $1", [id]);
  const invoice = invoiceResult.rows[0];
  if (!invoice) return null;
  invoice.due_date = isoDateOnly(invoice.due_date);

  const [items, payments] = await Promise.all([
    db.query("SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order, created_at", [id]),
    db.query(
      `SELECT id, receipt_number, amount, payment_method, reference, paid_at, notes, recorded_by
       FROM invoice_payments WHERE invoice_id = $1 ORDER BY paid_at DESC, created_at DESC`,
      [id],
    ),
  ]);

  let customer: { id: string; full_name: string; phone: string; address: string | null } | null = null;
  if (invoice.customer_id) {
    const customerResult = await db.query(
      "SELECT id, full_name, phone, address FROM customers WHERE id = $1",
      [invoice.customer_id],
    );
    customer = customerResult.rows[0] ?? null;
  }

  return { ...invoice, items: items.rows, payments: payments.rows, customer };
}

export async function getInvoiceFormData() {
  await ensureInvoiceTables();
  const [customersResult, productsResult, packagesResult] = await Promise.all([
    db.query("SELECT id, full_name, phone, address, customer_code FROM customers ORDER BY full_name"),
    db.query(`
      SELECT p.id, p.name, p.primary_sku, p.image_url,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', v.id, 'color', v.color, 'size', v.size, 'sku', v.sku,
            'price', v.price, 'beforePrice', COALESCE(v.price_before_discount, v.price),
            'stock', v.stock, 'minStockAlert', v.min_stock_alert,
            'imageUrl', v.image_url
          ) ORDER BY v.color, v.size)
          FROM product_variants v WHERE v.product_id = p.id
        ), '[]'::json) AS variants
      FROM products p
      ORDER BY p.name
    `),
    db.query(`
      SELECT p.id, p.name, p.primary_sku, p.image_url, p.status,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', v.id, 'name', v.name, 'sku', v.sku,
            'price', v.price_after_discount,
            'beforePrice', v.price_before_discount,
            'stock', COALESCE((
              SELECT MIN(TRUNC(pv.stock / GREATEST(pvi.quantity, 1)))::int
              FROM package_variant_items pvi
              JOIN product_variants pv ON pv.id = pvi.product_variant_id
              WHERE pvi.package_variant_id = v.id
            ), 0),
            'imageUrl', v.image_url,
            'components', COALESCE((
              SELECT json_agg(json_build_object(
                'productName', pr.name, 'color', pv.color, 'size', pv.size, 'quantity', s.quantity
              ) ORDER BY s.created_at)
              FROM package_variant_items s
              JOIN products pr ON pr.id = s.product_id
              JOIN product_variants pv ON pv.id = s.product_variant_id
              WHERE s.package_variant_id = v.id
            ), '[]'::json)
          ) ORDER BY v.sort_order, v.created_at)
          FROM package_variants v WHERE v.package_id = p.id
        ), '[]'::json) AS variants
      FROM packages p
      WHERE p.status <> 'archived'
      ORDER BY p.name
    `),
  ]);

  return {
    customers: customersResult.rows,
    products: productsResult.rows.filter((row) => Array.isArray(row.variants) && row.variants.length > 0),
    packages: packagesResult.rows.filter((row) => Array.isArray(row.variants) && row.variants.length > 0),
  };
}

export async function getCustomerInvoices(customerId: string) {
  await ensureInvoiceTables();
  const result = await db.query(
    `SELECT id, invoice_number, total, paid_amount,
       GREATEST(total - paid_amount, 0) AS remaining,
       due_date, status, created_at
     FROM invoices WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 12`,
    [customerId],
  );
  return result.rows;
}

export async function getCustomerBalance(customerId: string) {
  await ensureInvoiceTables();
  const result = await db.query(
    `SELECT
       COALESCE(SUM(GREATEST(total - paid_amount, 0)) FILTER (WHERE status <> 'cancelled'), 0) AS balance,
       COALESCE(SUM(paid_amount) FILTER (WHERE status <> 'cancelled'), 0) AS collected,
       COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled'), 0) AS billed,
       COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS invoices,
       COALESCE(SUM(GREATEST(total - paid_amount, 0))
         FILTER (WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE), 0) AS overdue,
       COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial') AND due_date < CURRENT_DATE)::int AS overdue_invoices
     FROM invoices WHERE customer_id = $1`,
    [customerId],
  );
  return result.rows[0];
}

export async function getCustomerStatement(customerId: string) {
  await ensureInvoiceTables();
  const customerResult = await db.query(
    "SELECT id, full_name, phone, customer_code, address FROM customers WHERE id = $1",
    [customerId],
  );
  if (!customerResult.rows[0]) return null;

  const [balanceRow, invoices, payments] = await Promise.all([
    getCustomerBalance(customerId),
    db.query(
      `SELECT id, invoice_number, total, paid_amount, GREATEST(total - paid_amount, 0) AS remaining,
              due_date, status, created_at
       FROM invoices WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId],
    ),
    db.query(
      `SELECT p.id, p.receipt_number, p.amount, p.payment_method, p.reference, p.paid_at,
              i.invoice_number
       FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
       WHERE i.customer_id = $1 ORDER BY p.paid_at DESC`,
      [customerId],
    ),
  ]);

  return { customer: customerResult.rows[0], balance: balanceRow, invoices: invoices.rows, payments: payments.rows };
}

export async function getPaymentsLedger(limit = 300) {
  await ensureInvoiceTables();
  const result = await db.query(
    `SELECT p.id, p.receipt_number, p.invoice_id, p.amount, p.payment_method, p.reference,
            p.paid_at, p.notes, p.recorded_by, i.invoice_number, i.customer_name,
            i.invoice_number AS invoice, i.total AS invoice_total, i.paid_amount AS invoice_paid
     FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
     ORDER BY p.paid_at DESC, p.created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function getReportData() {
  await ensureInvoiceTables();
  const [summary, methods, monthly, aging, debtors] = await Promise.all([
    db.query(`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled'), 0) AS billed,
        COALESCE(SUM(paid_amount) FILTER (WHERE status <> 'cancelled'), 0) AS collected,
        COALESCE(SUM(GREATEST(total - paid_amount, 0)) FILTER (WHERE status <> 'cancelled'), 0) AS outstanding,
        COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS invoices,
        (SELECT COUNT(*)::int FROM invoice_payments) AS payments,
        (SELECT COALESCE(AVG(amount), 0) FROM invoice_payments) AS avg_payment
      FROM invoices
    `),
    db.query(`
      SELECT p.payment_method AS method, COUNT(*)::int AS count,
             COALESCE(SUM(p.amount), 0) AS amount
      FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
      WHERE i.status <> 'cancelled'
      GROUP BY p.payment_method ORDER BY amount DESC
    `),
    db.query(`
      SELECT to_char(date_trunc('month', p.paid_at), 'YYYY-MM') AS month,
             COALESCE(SUM(p.amount), 0) AS amount, COUNT(*)::int AS count
      FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
      WHERE i.status <> 'cancelled'
        AND p.paid_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
      GROUP BY 1 ORDER BY 1
    `),
    db.query(`
      SELECT CASE
          WHEN due_date IS NULL OR due_date >= CURRENT_DATE THEN 'current'
          WHEN due_date >= CURRENT_DATE - 15 THEN '1-15'
          WHEN due_date >= CURRENT_DATE - 30 THEN '16-30'
          WHEN due_date >= CURRENT_DATE - 60 THEN '31-60'
          ELSE '60+' END AS bucket,
        COUNT(*)::int AS count,
        COALESCE(SUM(GREATEST(total - paid_amount, 0)), 0) AS amount
      FROM invoices WHERE status IN ('unpaid', 'partial')
      GROUP BY 1
    `),
    db.query(`
      SELECT customer_id, customer_name,
             COALESCE(SUM(GREATEST(total - paid_amount, 0)), 0) AS balance,
             COUNT(*)::int AS invoices
      FROM invoices WHERE status IN ('unpaid', 'partial') AND customer_id IS NOT NULL
      GROUP BY customer_id, customer_name
      ORDER BY balance DESC LIMIT 6
    `),
  ]);

  return {
    summary: summary.rows[0] ?? {},
    methods: methods.rows,
    monthly: monthly.rows,
    aging: aging.rows,
    debtors: debtors.rows,
  };
}

export async function exportRows(type: "invoices" | "payments" | "customers") {
  await ensureInvoiceTables();
  if (type === "invoices") {
    const result = await db.query(`
      SELECT invoice_number AS "رقم الفاتورة", customer_name AS "العميلة", customer_phone AS "الهاتف",
             to_char(created_at, 'YYYY-MM-DD') AS "التاريخ", total AS "الإجمالي",
             paid_amount AS "المدفوع", GREATEST(total - paid_amount, 0) AS "المتبقي",
             status AS "الحالة", delivery_status AS "حالة التوصيل", payment_method AS "طريقة الدفع", due_date AS "تاريخ الاستحقاق"
      FROM invoices ORDER BY created_at DESC
    `);
    return result.rows;
  }
  if (type === "payments") {
    const result = await db.query(`
      SELECT p.receipt_number AS "رقم الإيصال", i.invoice_number AS "رقم الفاتورة",
             i.customer_name AS "العميلة", to_char(p.paid_at, 'YYYY-MM-DD') AS "التاريخ",
             p.amount AS "المبلغ", p.payment_method AS "الطريقة", p.reference AS "المرجع",
             p.notes AS "ملاحظات"
      FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
      ORDER BY p.paid_at DESC
    `);
    return result.rows;
  }
  const result = await db.query(`
    SELECT customer_code AS "كود العميلة", full_name AS "الاسم", phone AS "الهاتف", address AS "العنوان",
           to_char(created_at, 'YYYY-MM-DD') AS "تاريخ الإضافة"
    FROM customers ORDER BY created_at DESC
  `);
  return result.rows;
}
