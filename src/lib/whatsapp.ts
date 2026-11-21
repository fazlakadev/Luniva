import { db, ensureWhatsAppTables, ensureCustomersTable, ensureInvoiceTables } from "@/lib/db";
import {
  WhatsAppTemplate,
  WhatsAppLogEntry,
  BroadcastCustomer,
  WhatsAppTemplateCategory,
  templateCategoryLabels,
  formatWhatsAppPhone,
  generateWhatsAppUrl,
  compileTemplate,
} from "./whatsapp-shared";

export * from "./whatsapp-shared";

/**
 * Retrieves all stored WhatsApp templates.
 */
export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  await ensureWhatsAppTables();
  const res = await db.query(
    "SELECT * FROM whatsapp_templates ORDER BY is_default DESC, category ASC, name ASC",
  );
  return res.rows;
}

/**
 * Creates or updates a WhatsApp template.
 */
export async function saveWhatsAppTemplate(input: {
  id?: string;
  category: WhatsAppTemplateCategory;
  name: string;
  content: string;
}): Promise<WhatsAppTemplate> {
  await ensureWhatsAppTables();

  if (input.id) {
    const res = await db.query(
      `UPDATE whatsapp_templates
       SET category = $1, name = $2, content = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [input.category, input.name.trim(), input.content.trim(), input.id],
    );
    return res.rows[0];
  }

  const res = await db.query(
    `INSERT INTO whatsapp_templates (category, name, content, is_default)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [input.category, input.name.trim(), input.content.trim()],
  );
  return res.rows[0];
}

/**
 * Deletes a template (only non-default templates).
 */
export async function deleteWhatsAppTemplate(id: string): Promise<boolean> {
  await ensureWhatsAppTables();
  const res = await db.query("DELETE FROM whatsapp_templates WHERE id = $1 AND is_default = false", [id]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Logs a message dispatch for audit and stats.
 */
export async function logWhatsAppDispatch(input: {
  customerId?: string | null;
  customerName?: string | null;
  phone: string;
  templateCategory?: string | null;
  message: string;
  sentBy?: string | null;
}): Promise<WhatsAppLogEntry> {
  await ensureWhatsAppTables();
  const res = await db.query(
    `INSERT INTO whatsapp_logs
      (customer_id, customer_name, phone, template_category, message, sent_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.customerId || null,
      input.customerName || null,
      input.phone,
      input.templateCategory || null,
      input.message,
      input.sentBy || null,
    ],
  );
  return res.rows[0];
}

/**
 * Retrieves the dispatch log history.
 */
export async function getWhatsAppLogs(limit = 100): Promise<WhatsAppLogEntry[]> {
  await ensureWhatsAppTables();
  const res = await db.query(
    "SELECT * FROM whatsapp_logs ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return res.rows;
}

/**
 * Retrieves analytics and summary statistics on WhatsApp automations.
 */
export async function getWhatsAppStats() {
  await ensureWhatsAppTables();
  const res = await db.query(`
    SELECT
      COUNT(*)::int AS total_sent,
      COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int AS sent_today,
      COUNT(DISTINCT customer_id)::int AS unique_customers_reached,
      (SELECT COUNT(*)::int FROM whatsapp_templates) AS templates_count
    FROM whatsapp_logs
  `);
  return res.rows[0];
}

/**
 * Retrieves audience segments for marketing campaigns.
 */
export async function getBroadcastAudience(
  segment: "all" | "vip" | "with_balance" | "inactive_30d" = "all",
): Promise<BroadcastCustomer[]> {
  await Promise.all([ensureCustomersTable(), ensureInvoiceTables()]);

  let whereExtra = "";
  if (segment === "vip") {
    whereExtra = "HAVING COALESCE(SUM(i.total), 0) >= 4000";
  } else if (segment === "with_balance") {
    whereExtra = "HAVING COALESCE(SUM(i.total - i.paid_amount), 0) > 0";
  } else if (segment === "inactive_30d") {
    whereExtra = "HAVING MAX(i.created_at) < NOW() - INTERVAL '30 days' OR MAX(i.created_at) IS NULL";
  }

  const query = `
    SELECT
      c.id,
      c.full_name,
      c.phone,
      COALESCE(SUM(i.total), 0)::float AS total_spent,
      COUNT(i.id)::int AS invoices_count,
      COALESCE(SUM(CASE WHEN i.status != 'cancelled' THEN (i.total - i.paid_amount) ELSE 0 END), 0)::float AS open_balance,
      MAX(i.created_at)::text AS last_order_date
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id
    WHERE c.phone IS NOT NULL AND TRIM(c.phone) != ''
    GROUP BY c.id, c.full_name, c.phone
    ${whereExtra}
    ORDER BY total_spent DESC, c.full_name ASC
  `;

  const res = await db.query(query);
  return res.rows;
}
