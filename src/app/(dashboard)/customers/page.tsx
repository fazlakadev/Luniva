import CustomersList from "@/components/customers-list";
import { db, ensureCustomersTable, ensureInvoiceTables } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await Promise.all([ensureCustomersTable(), ensureInvoiceTables()]);
  const result = await db.query(`
    SELECT c.id, c.full_name, c.phone, c.customer_code, c.address, c.image_url, c.created_at,
      (SELECT COUNT(*)::int FROM customer_phones cp WHERE cp.customer_id = c.id) AS phone_count,
      (SELECT COALESCE(SUM(GREATEST(i.total - i.paid_amount, 0)), 0) FROM invoices i
        WHERE i.customer_id = c.id AND i.status <> 'cancelled') AS balance,
      (SELECT COALESCE(SUM(GREATEST(i.total - i.paid_amount, 0)), 0) FROM invoices i
        WHERE i.customer_id = c.id AND i.status IN ('unpaid', 'partial') AND i.due_date < CURRENT_DATE) AS overdue
    FROM customers c
    ORDER BY c.created_at DESC
  `);
  return <CustomersList customers={result.rows} />;
}
