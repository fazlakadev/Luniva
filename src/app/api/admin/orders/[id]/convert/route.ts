import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { convertOrderToInvoice } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await convertOrderToInvoice(id, session.name || "المسؤول");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "تعذر تحويل الطلب إلى فاتورة.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
