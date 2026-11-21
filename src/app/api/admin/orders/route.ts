import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCustomerOrders, updateCustomerOrderStatus } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";

  const orders = await listCustomerOrders(status);
  return NextResponse.json({ ok: true, orders });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { id, status, adminNotes } = body;
  if (!id || !status) {
    return NextResponse.json({ error: "معرف الطلب والحالة مطلوبان." }, { status: 400 });
  }

  const updated = await updateCustomerOrderStatus(id, status, adminNotes);
  return NextResponse.json({ ok: true, order: updated });
}
