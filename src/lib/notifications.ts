import { db, ensureNotificationsTable } from "@/lib/db";
import { canonicalColorName } from "@/lib/colors";
import { formatMoney } from "@/lib/format";
import type {
  NotificationCategory,
  NotificationSeverity,
  NotificationRecord,
} from "@/lib/notification-types";

export type { NotificationCategory, NotificationSeverity, NotificationRecord };

export async function createNotification(input: {
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown> | null;
}) {
  await ensureNotificationsTable();
  const result = await db.query(
    `INSERT INTO notifications
      (category, type, title, message, link, severity, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.category,
      input.type,
      input.title,
      input.message,
      input.link || null,
      input.severity || "info",
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
  return result.rows[0] as NotificationRecord;
}

export async function getNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
  category?: string;
}) {
  await ensureNotificationsTable();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.unreadOnly) {
    conditions.push("read = FALSE");
  }

  if (options?.category && options.category !== "all") {
    params.push(options.category);
    conditions.push(`category = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(100, Math.max(1, options?.limit ?? 30));
  params.push(limit);

  const [notificationsResult, unreadCountResult] = await Promise.all([
    db.query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    ),
    db.query("SELECT COUNT(*)::int AS unread FROM notifications WHERE read = FALSE"),
  ]);

  return {
    notifications: notificationsResult.rows as NotificationRecord[],
    unreadCount: Number(unreadCountResult.rows[0]?.unread || 0),
  };
}

export async function markNotificationAsRead(id: string) {
  await ensureNotificationsTable();
  if (id === "all") {
    await db.query("UPDATE notifications SET read = TRUE WHERE read = FALSE");
    return { ok: true };
  }
  await db.query("UPDATE notifications SET read = TRUE WHERE id = $1", [id]);
  return { ok: true };
}

/**
 * Automatically evaluates the state of the database and generates notifications for:
 * 1. Out of stock / Low stock variants
 * 2. Appointments scheduled for today
 * 3. Overdue unpaid invoices
 * Avoids duplicate notifications within a cooling window (12-24 hours).
 */
export async function syncSystemNotifications() {
  await ensureNotificationsTable();

  // 1. Check out of stock & low stock variants
  const inventoryResult = await db.query(`
    SELECT pv.id, pv.color, pv.size, pv.sku, pv.stock, pv.min_stock_alert, p.name AS product_name, p.id AS product_id
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.stock <= pv.min_stock_alert
    ORDER BY pv.stock ASC
  `);

  for (const variant of inventoryResult.rows) {
    const isOut = Number(variant.stock) === 0;
    const type = isOut ? "inventory.out_of_stock" : "inventory.low_stock";
    const recent = await db.query(
      `SELECT id FROM notifications
       WHERE type = $1 AND metadata->>'variantId' = $2 AND created_at >= NOW() - INTERVAL '12 hours'
       LIMIT 1`,
      [type, variant.id],
    );

    if (recent.rowCount === 0) {
      const name = `${variant.product_name} (${canonicalColorName(variant.color)} - ${variant.size})`;
      await createNotification({
        category: "inventory",
        type,
        title: isOut ? `نفاد مخزون: ${name}` : `تنبيه نقص مخزون: ${name}`,
        message: isOut
          ? `نفد رصيد «${name}» بالكامل (0 قطعة). يتطلب تزويد المخزون فوراً لتجنب توقف المبيعات أو البكدجات المرتبطة به.`
          : `المتبقي من «${name}» هو ${variant.stock} قطع فقط (أقل من حد التنبيه ${variant.min_stock_alert} قطع).`,
        link: `/products/${variant.product_id}`,
        severity: isOut ? "danger" : "warning",
        metadata: { variantId: variant.id, productId: variant.product_id, stock: variant.stock },
      });
    }
  }

  // 2. Check today's appointments
  const appointmentsResult = await db.query(`
    SELECT a.id, a.title, a.appointment_date, a.appointment_time, a.status, a.customer_id,
           c.full_name AS customer_name
    FROM appointments a
    LEFT JOIN customers c ON c.id = a.customer_id
    WHERE a.appointment_date = CURRENT_DATE AND a.status = 'pending'
  `);

  for (const app of appointmentsResult.rows) {
    const recent = await db.query(
      `SELECT id FROM notifications
       WHERE type = 'appointment.today' AND metadata->>'appointmentId' = $1 AND created_at >= CURRENT_DATE
       LIMIT 1`,
      [app.id],
    );

    if (recent.rowCount === 0) {
      const timeStr = app.appointment_time ? `الساعة ${app.appointment_time}` : "اليوم";
      await createNotification({
        category: "appointment",
        type: "appointment.today",
        title: `موعد اليوم: ${app.title}`,
        message: `لديك موعد مجدول اليوم (${timeStr}) ${app.customer_name ? `مع العميلة ${app.customer_name}` : ""}.`,
        link: "/appointments",
        severity: "info",
        metadata: { appointmentId: app.id, customerId: app.customer_id },
      });
    }
  }

  // 3. Check overdue invoices
  const overdueResult = await db.query(`
    SELECT id, invoice_number, customer_name, total, paid_amount, due_date
    FROM invoices
    WHERE due_date < CURRENT_DATE AND status IN ('unpaid', 'partial')
  `);

  for (const inv of overdueResult.rows) {
    const recent = await db.query(
      `SELECT id FROM notifications
       WHERE type = 'invoice.overdue' AND metadata->>'invoiceId' = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [inv.id],
    );

    if (recent.rowCount === 0) {
      const remaining = Number(inv.total) - Number(inv.paid_amount);
      await createNotification({
        category: "sales",
        type: "invoice.overdue",
        title: `فاتورة متأخرة: ${inv.invoice_number}`,
        message: `الفاتورة ${inv.invoice_number} الخاصة بـ ${inv.customer_name} تجاوزت تاريخ الاستحقاق بمبلغ متبقي ${formatMoney(remaining)}.`,
        link: `/invoices/${inv.id}`,
        severity: "warning",
        metadata: { invoiceId: inv.id, invoiceNumber: inv.invoice_number },
      });
    }
  }
}
