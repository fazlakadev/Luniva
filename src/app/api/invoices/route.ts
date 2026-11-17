import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureInvoiceTables } from "@/lib/db";
import { getInvoicesList } from "@/lib/invoice-queries";
import { createInvoice, normalizeInvoicePayload } from "@/lib/invoices";

export const runtime = "nodejs";

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const invoices = await getInvoicesList();
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Unable to load invoices", error);
    return NextResponse.json({ error: "تعذر تحميل الفواتير." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureInvoiceTables();
    const body = await request.json();
    const input = normalizeInvoicePayload(body);
    const id = await createInvoice(input, session.name);
    return NextResponse.json({ invoice: { id } }, { status: 201 });
  } catch (error) {
    console.error("Unable to create invoice", error);
    const message = error instanceof Error ? error.message : "تعذر إنشاء الفاتورة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
