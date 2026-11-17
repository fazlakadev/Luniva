import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deliveryStatusLabels, normalizeDeliveryStatus } from "@/lib/invoice-shared";
import { setInvoiceDeliveryStatus } from "@/lib/invoices";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const status = normalizeDeliveryStatus(body.deliveryStatus ?? body.status);
    if (!status) return NextResponse.json({ error: "حالة التوصيل غير صحيحة." }, { status: 400 });

    const result = await setInvoiceDeliveryStatus(id, status, session.name);
    if (!result) return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });

    return NextResponse.json({
      deliveryStatus: result.deliveryStatus,
      statusLabel: deliveryStatusLabels[result.deliveryStatus],
      changed: result.changed,
    });
  } catch (error) {
    console.error("Unable to update delivery status", error);
    return NextResponse.json({ error: "تعذر تحديث حالة التوصيل." }, { status: 500 });
  }
}
