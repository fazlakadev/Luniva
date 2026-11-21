import type { Metadata } from "next";
import AppointmentsBoard from "@/components/appointments-board";
import { listAppointments } from "@/lib/appointments";
import { isUuid } from "@/lib/appointment-shared";
import { db, ensureAppointmentsTable, ensureCustomersTable } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المواعيد والمتابعات | لونيفا",
  description: "جدول متابعة العملاء والتحصيل والتسليم، مرتبط بملفات العميلات والفواتير.",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await Promise.all([ensureAppointmentsTable(), ensureCustomersTable()]);
  const query = await searchParams;
  const customerParam = typeof query.customer === "string" ? query.customer : "";
  const invoiceParam = typeof query.invoice === "string" ? query.invoice : "";

  const [appointments, customersResult, invoicesResult] = await Promise.all([
    listAppointments(),
    db.query("SELECT id, full_name, phone FROM customers ORDER BY full_name ASC"),
    db.query(
      `SELECT id, invoice_number, customer_id, total, status
         FROM invoices
        ORDER BY created_at DESC
        LIMIT 500`,
    ),
  ]);

  return (
    <AppointmentsBoard
      initialAppointments={appointments}
      customers={customersResult.rows as Array<{ id: string; full_name: string }>}
      invoices={
        invoicesResult.rows as Array<{
          id: string;
          invoice_number: string;
          customer_id: string | null;
          total: string;
          status: string;
        }>
      }
      presetCustomerId={isUuid(customerParam) ? customerParam : null}
      presetInvoiceId={isUuid(invoiceParam) ? invoiceParam : null}
    />
  );
}
