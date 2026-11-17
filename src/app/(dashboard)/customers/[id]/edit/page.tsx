import { notFound } from "next/navigation";
import CustomerForm from "@/components/customer-form";
import { db, ensureCustomersTable } from "@/lib/db";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureCustomersTable();
  const { id } = await params;

  const result = await db.query(
    "SELECT id, full_name, phone, customer_code, address, image_url, created_at FROM customers WHERE id = $1",
    [id],
  );
  if (!result.rows[0]) notFound();

  const phones = await db.query(
    "SELECT phone FROM customer_phones WHERE customer_id = $1 ORDER BY created_at",
    [id],
  );

  return (
    <CustomerForm
      customer={{ ...result.rows[0], phones: phones.rows.map((row) => row.phone) }}
    />
  );
}
