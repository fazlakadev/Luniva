import { db, ensureCustomerOrdersTable, ensureInvoiceTables } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export type CustomerOrderItem = {
  id: string;
  order_id: string;
  item_type: "product" | "package";
  item_id: string | null;
  variant_id: string | null;
  title: string;
  sku: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string | null;
  created_at: string;
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  delivery_area: string | null;
  status: "new" | "contacted" | "converted" | "cancelled";
  notes: string | null;
  admin_notes: string | null;
  total_estimated: number;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  items?: CustomerOrderItem[];
  items_count?: number;
};

export const orderStatusLabels: Record<string, string> = {
  new: "جديد (لم يتم التواصل)",
  contacted: "تم التواصل والمتابعة",
  converted: "تم التحويل لفاتورة رسمية ✓",
  cancelled: "ملغي",
};

export async function listCustomerOrders(status?: string): Promise<CustomerOrder[]> {
  await ensureCustomerOrdersTable();

  let query = `
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.customer_name,
      o.customer_phone,
      o.customer_email,
      o.customer_address,
      o.delivery_area,
      o.status,
      o.notes,
      o.admin_notes,
      o.total_estimated::float AS total_estimated,
      o.converted_invoice_id,
      o.created_at::text,
      o.updated_at::text,
      COUNT(i.id)::int AS items_count,
      COALESCE(
        json_agg(
          json_build_object(
            'id', i.id,
            'title', i.title,
            'item_type', i.item_type,
            'color', i.color,
            'size', i.size,
            'quantity', i.quantity,
            'unit_price', i.unit_price::float,
            'total_price', i.total_price::float,
            'image_url', i.image_url
          )
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM customer_orders o
    LEFT JOIN customer_order_items i ON i.order_id = o.id
  `;

  const params: any[] = [];
  if (status && status !== "all") {
    params.push(status);
    query += ` WHERE o.status = $1`;
  }

  query += `
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  const res = await db.query(query, params);
  return res.rows;
}

export async function getCustomerOrderDetail(id: string): Promise<CustomerOrder | null> {
  await ensureCustomerOrdersTable();

  const orderRes = await db.query(
    `SELECT
      id, order_number, customer_id, customer_name, customer_phone, customer_email,
      customer_address, delivery_area, status, notes, admin_notes,
      total_estimated::float AS total_estimated, converted_invoice_id,
      created_at::text, updated_at::text
     FROM customer_orders
     WHERE id = $1`,
    [id],
  );

  if (!orderRes.rowCount || !orderRes.rows[0]) return null;
  const order = orderRes.rows[0];

  const itemsRes = await db.query(
    `SELECT
      id, order_id, item_type, item_id, variant_id, title, sku, color, size,
      quantity, unit_price::float AS unit_price, total_price::float AS total_price,
      image_url, created_at::text
     FROM customer_order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [id],
  );

  return { ...order, items: itemsRes.rows };
}

export async function updateCustomerOrderStatus(
  id: string,
  status: "new" | "contacted" | "converted" | "cancelled",
  adminNotes?: string,
) {
  await ensureCustomerOrdersTable();
  const res = await db.query(
    `UPDATE customer_orders
     SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, adminNotes || null, id],
  );
  return res.rows[0];
}

export async function convertOrderToInvoice(orderId: string, createdBy: string = "المسؤول") {
  await Promise.all([ensureCustomerOrdersTable(), ensureInvoiceTables()]);

  const order = await getCustomerOrderDetail(orderId);
  if (!order) throw new Error("طلب الشراء غير موجود.");

  // Generate invoice number
  const seqRes = await db.query("SELECT nextval('invoices_number_seq') AS num");
  const invoiceNumber = `INV-2026-${seqRes.rows[0].num}`;

  // Insert invoice
  const invRes = await db.query(
    `INSERT INTO invoices
      (invoice_number, customer_id, customer_name, customer_phone, customer_address,
       total, paid_amount, status, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 'unpaid', $7, $8)
     RETURNING id, invoice_number`,
    [
      invoiceNumber,
      order.customer_id,
      order.customer_name,
      order.customer_phone,
      order.customer_address,
      order.total_estimated,
      `تم التحويل تلقائياً من استفسار الشراء رقم ${order.order_number}${order.notes ? ` - ملاحظات العميلة: ${order.notes}` : ""}`,
      createdBy,
    ],
  );

  const invoiceId = invRes.rows[0].id;

  // Insert items
  if (order.items && order.items.length > 0) {
    for (let i = 0; i < order.items.length; i++) {
      const it = order.items[i];
      await db.query(
        `INSERT INTO invoice_items
          (invoice_id, item_type, product_id, package_id, variant_id, title, color, size, quantity, unit_price, total, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          invoiceId,
          it.item_type,
          it.item_type === "product" ? it.item_id : null,
          it.item_type === "package" ? it.item_id : null,
          it.variant_id,
          it.title,
          it.color,
          it.size,
          it.quantity,
          it.unit_price,
          it.total_price,
          i,
        ],
      );
    }
  }

  // Mark order as converted
  await db.query(
    `UPDATE customer_orders
     SET status = 'converted', converted_invoice_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [invoiceId, orderId],
  );

  return { invoiceId, invoiceNumber };
}
