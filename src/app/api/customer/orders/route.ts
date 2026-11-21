import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { db, ensureCustomerOrdersTable } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }

    await ensureCustomerOrdersTable();

    const ordersRes = await db.query(
      `SELECT id, order_number, customer_name, customer_phone, customer_email,
              customer_address, notes, total_estimated, status, admin_notes, created_at, updated_at
         FROM customer_orders
        WHERE customer_id = $1::uuid OR customer_phone = $2
        ORDER BY created_at DESC`,
      [session.customerId, session.phone],
    );

    const orders = [];
    for (const row of ordersRes.rows) {
      const itemsRes = await db.query(
        `SELECT id, item_type, item_id, variant_id, title, sku, color, size,
                quantity, unit_price, total_price, image_url
           FROM customer_order_items
          WHERE order_id = $1::uuid
          ORDER BY id ASC`,
        [row.id],
      );

      orders.push({
        ...row,
        total_estimated: Number(row.total_estimated) || 0,
        items: itemsRes.rows.map((it) => ({
          ...it,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          total_price: Number(it.total_price) || 0,
        })),
      });
    }

    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    console.error("Failed to fetch customer orders:", error);
    return NextResponse.json({ ok: false, error: "تعذر تحميل طلباتك." }, { status: 500 });
  }
}
