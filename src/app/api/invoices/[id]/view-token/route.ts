import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureInvoiceTables } from "@/lib/db";
import { getPublicInvoiceUrl, invoiceQrDataUrl, rotateInvoiceViewToken } from "@/lib/invoice-view";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Rotate the share link of an invoice. Old links stop working immediately. */
export async function POST(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    await ensureInvoiceTables();
    const { id } = await params;
    const rotated = await rotateInvoiceViewToken(id);
    if (!rotated) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
    const url = await getPublicInvoiceUrl(id);
    if (!url) return NextResponse.json({ error: "تعذر إنشاء الرابط." }, { status: 500 });
    const qr = await invoiceQrDataUrl(url);
    return NextResponse.json({ url, qr });
  } catch (error) {
    console.error("Unable to rotate invoice link", error);
    return NextResponse.json({ error: "تعذر تجديد رابط الفاتورة." }, { status: 500 });
  }
}
