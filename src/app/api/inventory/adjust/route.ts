import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { adjustVariantStock, getInventoryStats, getLowStockAlerts, getInventoryTransactions } from "@/lib/inventory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    const variantId = url.searchParams.get("variantId") || undefined;
    const productId = url.searchParams.get("productId") || undefined;

    if (view === "alerts") {
      const alerts = await getLowStockAlerts();
      return NextResponse.json({ alerts });
    }

    if (view === "history") {
      const history = await getInventoryTransactions({ variantId, productId });
      return NextResponse.json({ history });
    }

    const [stats, alerts, history] = await Promise.all([
      getInventoryStats(),
      getLowStockAlerts(10),
      getInventoryTransactions({ limit: 20 }),
    ]);

    return NextResponse.json({ stats, alerts, history });
  } catch (error) {
    console.error("Unable to load inventory data", error);
    return NextResponse.json({ error: "تعذر تحميل بيانات المخزون." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      variantId?: string;
      newStock?: number;
      delta?: number;
      type?: "manual_adjustment" | "restock" | "damage_or_loss";
      notes?: string;
    };

    if (!body.variantId) {
      return NextResponse.json({ error: "معرّف المتغير مطلوب." }, { status: 400 });
    }

    const result = await adjustVariantStock({
      variantId: body.variantId,
      newStock: body.newStock,
      delta: body.delta,
      type: body.type,
      notes: body.notes,
      actor: session.name,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Unable to adjust inventory", error);
    const message = error instanceof Error ? error.message : "تعذر تعديل المخزون.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
