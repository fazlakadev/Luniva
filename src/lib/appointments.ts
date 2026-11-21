import { db, ensureAppointmentsTable } from "@/lib/db";
import type { AppointmentRecord } from "@/lib/appointment-shared";

type ListOptions = {
  customerId?: string | null;
  invoiceId?: string | null;
  limit?: number;
  upcomingOnly?: boolean;
};

const SELECT_COLUMNS = `
  a.id, a.title, a.notes,
  to_char(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
  a.appointment_time, a.tone, a.kind, a.status,
  a.customer_id, a.invoice_id,
  a.created_at::text AS created_at, a.updated_at::text AS updated_at,
  c.full_name AS customer_name,
  c.phone AS customer_phone,
  i.invoice_number
`;

/** Loads appointments with their linked customer and invoice, newest schedule first. */
export async function listAppointments(options: ListOptions = {}): Promise<AppointmentRecord[]> {
  await ensureAppointmentsTable();
  const limit = Math.min(1000, Math.max(1, Math.trunc(options.limit ?? 500)));
  const result = await db.query(
    `SELECT ${SELECT_COLUMNS}
       FROM appointments a
       LEFT JOIN customers c ON c.id = a.customer_id
       LEFT JOIN invoices i ON i.id = a.invoice_id
      WHERE ($1::uuid IS NULL OR a.customer_id = $1)
        AND ($2::uuid IS NULL OR a.invoice_id = $2)
        AND ($3::boolean IS NOT TRUE OR (a.status = 'pending' AND a.appointment_date >= CURRENT_DATE))
      ORDER BY a.appointment_date ASC, a.appointment_time ASC NULLS LAST, a.created_at ASC
      LIMIT $4`,
    [options.customerId ?? null, options.invoiceId ?? null, options.upcomingOnly === true, limit],
  );
  return result.rows as AppointmentRecord[];
}

/** A compact upcoming list for a customer profile. */
export async function getCustomerAppointments(customerId: string, limit = 4): Promise<AppointmentRecord[]> {
  return listAppointments({ customerId, upcomingOnly: true, limit });
}

/** A compact upcoming list for an invoice / collection record. */
export async function getInvoiceAppointments(invoiceId: string, limit = 3): Promise<AppointmentRecord[]> {
  return listAppointments({ invoiceId, upcomingOnly: true, limit });
}

export async function getAppointment(id: string): Promise<AppointmentRecord | null> {
  await ensureAppointmentsTable();
  const result = await db.query(
    `SELECT ${SELECT_COLUMNS}
       FROM appointments a
       LEFT JOIN customers c ON c.id = a.customer_id
       LEFT JOIN invoices i ON i.id = a.invoice_id
      WHERE a.id = $1`,
    [id],
  );
  return (result.rows[0] as AppointmentRecord | undefined) ?? null;
}
