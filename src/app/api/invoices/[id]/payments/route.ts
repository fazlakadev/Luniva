import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listInvoicePayments, recordPayment } from "@/lib/payments";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json({ payments: await listInvoicePayments(id) });
  } catch (error) {
    console.error("Unable to list payments", error);
    return NextResponse.json({ error: "تعذر تحميل الدفعات." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await recordPayment(id, body, session.name);
    if (!result) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Unable to record payment", error);
    const message = error instanceof Error ? error.message : "تعذر تسجيل الدفعة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
