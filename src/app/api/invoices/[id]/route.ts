import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { db, ensureInvoiceTables } from "@/lib/db";
import { getInvoiceDetail } from "@/lib/invoice-queries";
import { updateInvoice, type InvoicePatch } from "@/lib/invoices";

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

export async function DELETE(_request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureInvoiceTables();
    const { id } = await params;
    const invoice = await db.query("SELECT invoice_number FROM invoices WHERE id = $1", [id]);
    const result = await db.query("DELETE FROM invoices WHERE id = $1", [id]);
    if (!result.rowCount) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
    await logActivity({
      entityType: "invoice",
      entityId: id,
      action: "invoice.deleted",
      summary: `حذف الفاتورة ${invoice.rows[0]?.invoice_number ?? id}`,
      actor: session.name,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete invoice", error);
    return NextResponse.json({ error: "تعذر حذف الفاتورة." }, { status: 500 });
  }
}
