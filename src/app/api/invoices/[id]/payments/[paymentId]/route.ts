import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deletePayment, updatePayment } from "@/lib/payments";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; paymentId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id, paymentId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await updatePayment(id, paymentId, body, session.name);
    if (!result) return NextResponse.json({ error: "الدفعة غير موجودة." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unable to update payment", error);
    const message = error instanceof Error ? error.message : "تعذر تعديل الدفعة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const { id, paymentId } = await params;
    const result = await deletePayment(id, paymentId, session.name);
    if (!result) return NextResponse.json({ error: "الدفعة غير موجودة." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unable to delete payment", error);
    const message = error instanceof Error ? error.message : "تعذر حذف الدفعة.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
