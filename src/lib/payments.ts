import type { PoolClient } from "pg";
import { logActivity } from "@/lib/activity";
import { db, ensureInvoiceTables } from "@/lib/db";
import {
  PAYMENT_METHODS,
  deriveInvoiceStatus,
  type PaymentMethod,
  type PaymentRow,
} from "@/lib/invoice-shared";

export type PaymentInput = {
  amount: number;
  method: PaymentMethod;
  reference: string;
  paidAt: string;
  notes: string;
};

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: unknown, fallback: string) {
  const raw = readString(value);
  if (!raw) return fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("تاريخ الدفع غير صحيح.");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.getTime() > tomorrow.getTime()) throw new Error("لا يمكن تسجيل دفع في تاريخ قادم.");
  return date.toISOString();
}

/** Accepts a full payload or a partial patch merged over an existing payment. */
export function normalizePaymentPayload(raw: unknown, existing?: PaymentRow | null): PaymentInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  const base: PaymentInput = {
    amount: existing ? Number(existing.amount) : 0,
    method: existing?.payment_method ?? "cash",
    reference: existing?.reference ?? "",
    paidAt: existing?.paid_at ?? new Date().toISOString(),
    notes: existing?.notes ?? "",
  };

  if (body.amount !== undefined || !existing) {
    const amount = roundMoney(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("أدخلي مبلغ دفع أكبر من صفر.");
    if (amount > 100_000_000) throw new Error("مبلغ الدفع كبير جدًا.");
    base.amount = amount;
  }

  if (body.method !== undefined || !existing) {
    base.method = PAYMENT_METHODS.includes(body.method as PaymentMethod)
      ? (body.method as PaymentMethod)
      : "cash";
  }

  if (body.reference !== undefined) base.reference = readString(body.reference);
  if (base.reference.length > 120) throw new Error("الرقم المرجعي طويل جدًا.");

  if (body.paidAt !== undefined || !existing) {
    base.paidAt = normalizeDate(body.paidAt, new Date().toISOString());
  }

  if (body.notes !== undefined) base.notes = readString(body.notes);
  if (base.notes.length > 500) throw new Error("ملاحظات الإيصال طويلة جدًا.");

  return base;
}

export async function nextReceiptNumber(client: PoolClient) {
  const result = await client.query("SELECT nextval('invoice_receipts_number_seq') AS seq");
  return `RCP-${String(Number(result.rows[0].seq)).padStart(4, "0")}`;
}

export async function listInvoicePayments(invoiceId: string): Promise<PaymentRow[]> {
  await ensureInvoiceTables();
  const result = await db.query(
    `SELECT id, receipt_number, invoice_id, amount, payment_method, reference,
            paid_at, notes, recorded_by
     FROM invoice_payments WHERE invoice_id = $1 ORDER BY paid_at DESC, created_at DESC`,
    [invoiceId],
  );
  return result.rows;
}

export async function listAllPayments(limit = 200): Promise<PaymentRow[]> {
  await ensureInvoiceTables();
  const result = await db.query(
    `SELECT p.id, p.receipt_number, p.invoice_id, p.amount, p.payment_method, p.reference,
            p.paid_at, p.notes, p.recorded_by,
            i.invoice_number, i.customer_name
     FROM invoice_payments p
     JOIN invoices i ON i.id = p.invoice_id
     ORDER BY p.paid_at DESC, p.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function getPaymentReceipt(paymentId: string): Promise<PaymentRow | null> {
  await ensureInvoiceTables();
  const result = await db.query(
    `SELECT p.*, i.invoice_number, i.customer_name, i.customer_phone, i.customer_address,
            i.total AS invoice_total, i.paid_amount AS invoice_paid, i.due_date
     FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
     WHERE p.id = $1`,
    [paymentId],
  );
  return result.rows[0] ?? null;
}

async function refreshInvoiceTotals(client: PoolClient, invoiceId: string) {
  const sums = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS paid,
            COUNT(*)::int AS payments_count
     FROM invoice_payments WHERE invoice_id = $1`,
    [invoiceId],
  );
  const invoiceResult = await client.query("SELECT total, status FROM invoices WHERE id = $1", [invoiceId]);
  const invoice = invoiceResult.rows[0];
  const paid = roundMoney(Number(sums.rows[0].paid));
  const cancelled = invoice?.status === "cancelled";
  const status = deriveInvoiceStatus(Number(invoice?.total ?? 0), paid, cancelled);
  await client.query(
    "UPDATE invoices SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3",
    [paid, status, invoiceId],
  );
  return { paid, status, paymentsCount: Number(sums.rows[0].payments_count) };
}

export async function recordPayment(invoiceId: string, raw: unknown, actor?: string) {
  await ensureInvoiceTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
    const invoice = locked.rows[0];
    if (!invoice) return null;
    if (invoice.status === "cancelled") throw new Error("لا يمكن التحصيل على فاتورة ملغاة.");

    const input = normalizePaymentPayload(raw);
    const remaining = roundMoney(Number(invoice.total) - Number(invoice.paid_amount));
    if (remaining <= 0.001) throw new Error("هذه الفاتورة محصّلة بالكامل.");
    if (input.amount > remaining + 0.001) {
      throw new Error(`المبلغ أكبر من المتبقي (${remaining.toFixed(2)}). عدّلي المبلغ أو إجمالي الفاتورة.`);
    }

    const receiptNumber = await nextReceiptNumber(client);
    const inserted = await client.query(
      `INSERT INTO invoice_payments
        (receipt_number, invoice_id, amount, payment_method, reference, paid_at, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [receiptNumber, invoiceId, input.amount, input.method, input.reference || null, input.paidAt, input.notes || null, actor ?? null],
    );
    const totals = await refreshInvoiceTotals(client, invoiceId);
    await logActivity(
      {
        entityType: "payment",
        entityId: String(inserted.rows[0].id),
        action: "payment.recorded",
        summary: `تحصيل ${input.amount.toFixed(2)} للفاتورة ${invoice.invoice_number} — ${receiptNumber}`,
        actor,
      },
      client,
    );
    await client.query("COMMIT");
    return { payment: inserted.rows[0], ...totals };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePayment(invoiceId: string, paymentId: string, raw: unknown, actor?: string) {
  await ensureInvoiceTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
    const invoice = locked.rows[0];
    if (!invoice) return null;
    if (invoice.status === "cancelled") throw new Error("لا يمكن تعديل دفعة على فاتورة ملغاة.");

    const currentResult = await client.query(
      "SELECT * FROM invoice_payments WHERE id = $1 AND invoice_id = $2",
      [paymentId, invoiceId],
    );
    const current = currentResult.rows[0] as PaymentRow | undefined;
    if (!current) return null;

    const input = normalizePaymentPayload(raw, current);
    const othersResult = await client.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM invoice_payments WHERE invoice_id = $1 AND id <> $2",
      [invoiceId, paymentId],
    );
    const available = roundMoney(Number(invoice.total) - Number(othersResult.rows[0].total));
    if (input.amount > available + 0.001) {
      throw new Error(`المبلغ الأقصى لهذه الدفعة ${available.toFixed(2)}.`);
    }

    const updated = await client.query(
      `UPDATE invoice_payments
       SET amount = $1, payment_method = $2, reference = $3, paid_at = $4, notes = $5
       WHERE id = $6 AND invoice_id = $7 RETURNING *`,
      [input.amount, input.method, input.reference || null, input.paidAt, input.notes || null, paymentId, invoiceId],
    );
    const totals = await refreshInvoiceTotals(client, invoiceId);
    await logActivity(
      {
        entityType: "payment",
        entityId: paymentId,
        action: "payment.updated",
        summary: `تعديل الدفعة ${current.receipt_number} للفاتورة ${invoice.invoice_number}`,
        actor,
      },
      client,
    );
    await client.query("COMMIT");
    return { payment: updated.rows[0], ...totals };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePayment(invoiceId: string, paymentId: string, actor?: string) {
  await ensureInvoiceTables();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
    const invoice = locked.rows[0];
    if (!invoice) return null;
    if (invoice.status === "cancelled") throw new Error("لا يمكن حذف دفعة من فاتورة ملغاة.");

    const deleted = await client.query(
      "DELETE FROM invoice_payments WHERE id = $1 AND invoice_id = $2 RETURNING receipt_number, amount",
      [paymentId, invoiceId],
    );
    if (!deleted.rows[0]) return null;

    const totals = await refreshInvoiceTotals(client, invoiceId);
    await logActivity(
      {
        entityType: "payment",
        entityId: paymentId,
        action: "payment.deleted",
        summary: `حذف الدفعة ${deleted.rows[0].receipt_number} من الفاتورة ${invoice.invoice_number}`,
        actor,
      },
      client,
    );
    await client.query("COMMIT");
    return { ...totals, deleted: deleted.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
