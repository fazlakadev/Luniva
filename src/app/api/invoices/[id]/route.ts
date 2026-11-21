import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { db, ensureInvoiceTables } from "@/lib/db";
import { getInvoiceDetail } from "@/lib/invoice-queries";
import { normalizeInvoicePayload, updateInvoice, updateInvoiceWithItems, type InvoicePatch } from "@/lib/invoices";
import { restoreInvoiceInventory } from "@/lib/inventory";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id } = await params;
    const invoice = await getInvoiceDetail(id);
    if (!invoice) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Unable to load invoice", error);
    return NextResponse.json({ error: "تعذر تحميل الفاتورة." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureInvoiceTables();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const patch: InvoicePatch = {};

    if (body.discountType === "percent" || body.discountType === "amount") patch.discountType = body.discountType;
    if (body.discountValue !== undefined) patch.discountValue = Number(body.discountValue);
    if (body.deliveryFee !== undefined) patch.deliveryFee = Number(body.deliveryFee);
    if (body.paidAmount !== undefined) patch.paidAmount = Number(body.paidAmount);
    if (body.status === "cancelled" || body.status === "unpaid" || body.status === "partial" || body.status === "paid") {
      patch.status = body.status;
    }
    if (typeof body.notes === "string") patch.notes = body.notes;
    if (typeof body.deliveryArea === "string") patch.deliveryArea = body.deliveryArea;
    if (body.dueDate === null) patch.dueDate = "";
    else if (typeof body.dueDate === "string") patch.dueDate = body.dueDate;
    if (body.paymentMethod === "cash" || body.paymentMethod === "card" || body.paymentMethod === "transfer" || body.paymentMethod === "wallet") {
      patch.paymentMethod = body.paymentMethod;
    }

    const result = await updateInvoice(id, patch, session.name);
    if (!result) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
    return NextResponse.json({ invoice: result });
  } catch (error) {
    console.error("Unable to update invoice", error);
    const message = error instanceof Error ? error.message : "تعذر تحديث الفاتورة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Full edit of an existing invoice (customer, items and pricing). */
export async function PUT(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureInvoiceTables();
    const { id } = await params;
    const input = normalizeInvoicePayload(await request.json());
    const result = await updateInvoiceWithItems(id, input, session.name);
    if (!result) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
    return NextResponse.json({ invoice: result });
  } catch (error) {
    console.error("Unable to edit invoice", error);
    const message = error instanceof Error ? error.message : "تعذر تعديل الفاتورة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureInvoiceTables();
    const { id } = await params;
    const invoice = await db.query("SELECT invoice_number, status FROM invoices WHERE id = $1", [id]);
    if (!invoice.rowCount) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });

    const invoiceRow = invoice.rows[0];
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      if (invoiceRow.status !== "cancelled") {
        await restoreInvoiceInventory(client, id, invoiceRow.invoice_number, session.name);
      }
      await client.query("DELETE FROM invoices WHERE id = $1", [id]);
      await logActivity(
        {
          entityType: "invoice",
          entityId: id,
          action: "invoice.deleted",
          summary: `حذف الفاتورة ${invoiceRow.invoice_number ?? id}`,
          actor: session.name,
        },
        client,
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete invoice", error);
    return NextResponse.json({ error: "تعذر حذف الفاتورة." }, { status: 500 });
  }
}
