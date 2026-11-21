import { NextResponse } from "next/server";
import { db, ensureCustomerOrdersTable } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { createNotification } from "@/lib/notifications";
import { formatWhatsAppPhone, generateWhatsAppUrl } from "@/lib/whatsapp-shared";
import { formatMoney } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureCustomerOrdersTable();
    const body = await request.json();
    const { customerName, customerPhone, customerEmail, customerAddress, notes, items } = body;

    if (!customerName?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { ok: false, error: "اسم العميلة ورقم الهاتف مطلوبان لتأكيد الاستفسار والطلب." },
        { status: 400 },
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "سلة الطلبات فارغة." },
        { status: 400 },
      );
    }

    const session = await getCustomerSession();
    let customerId = session?.customerId || null;

    // If not logged in, try to link with an existing customer by phone
    const cleanPhone = customerPhone.trim();
    if (!customerId) {
      const match = await db.query(
        "SELECT id FROM customers WHERE phone = $1 LIMIT 1",
        [cleanPhone],
      );
      if (match.rowCount && match.rows[0]) {
        customerId = match.rows[0].id;
      } else {
        // Create a customer record
        const codeSeqRes = await db.query("SELECT nextval('customers_code_seq') AS next_code");
        const nextSeq = codeSeqRes.rows[0]?.next_code || Math.floor(1000 + Math.random() * 9000);
        const customerCode = `CUST-${nextSeq}`;
        const newCustRes = await db.query(
          `INSERT INTO customers (full_name, phone, email, address, customer_code, auth_provider)
           VALUES ($1, $2, $3, $4, $5, 'order_inquiry')
           RETURNING id`,
          [customerName.trim(), cleanPhone, customerEmail?.trim() || null, customerAddress?.trim() || null, customerCode],
        );
        customerId = newCustRes.rows[0].id;
      }
    }

    // Generate Order Number
    const seqRes = await db.query("SELECT nextval('order_number_seq') AS next_num");
    const num = seqRes.rows[0]?.next_num || Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${num}`;

    // Calculate total estimated
    const totalEstimated = items.reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0,
    );

    // Insert order
    const orderRes = await db.query(
      `INSERT INTO customer_orders
        (order_number, customer_id, customer_name, customer_phone, customer_email, customer_address, notes, total_estimated, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
       RETURNING id, order_number, created_at`,
      [
        orderNumber,
        customerId,
        customerName.trim(),
        cleanPhone,
        customerEmail?.trim() || null,
        customerAddress?.trim() || null,
        notes?.trim() || null,
        totalEstimated,
      ],
    );

    const orderId = orderRes.rows[0].id;

    // Insert items
    for (const it of items) {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Number(it.price) || 0;
      const itemTotal = unitPrice * qty;

      await db.query(
        `INSERT INTO customer_order_items
          (order_id, item_type, item_id, variant_id, title, sku, color, size, quantity, unit_price, total_price, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          orderId,
          it.itemType || "product",
          it.itemId || null,
          it.variantId || null,
          it.title || "قطعة",
          it.sku || null,
          it.color || null,
          it.size || null,
          qty,
          unitPrice,
          itemTotal,
          it.imageUrl || null,
        ],
      );
    }

    // Trigger Admin Notification
    try {
      await createNotification({
        category: "sales",
        type: "order_inquiry",
        title: `طلب حجز واستفسار جديد: ${orderNumber}`,
        message: `العميلة ${customerName.trim()} أرسلت استفسار شراء بقيمة تقديرية ${formatMoney(totalEstimated)} (${items.length} قطع).`,
        link: `/orders`,
        severity: "info",
      });
    } catch {
      // ignore
    }

    // Generate direct WhatsApp link to Atelier
    const adminPhone = "201012345678"; // or store phone
    const itemsSummary = items
      .map(
        (it: any) =>
          `• ${it.title}${it.color ? ` (لون: ${it.color})` : ""}${it.size ? ` (مقاس: ${it.size})` : ""} × ${it.quantity}`,
      )
      .join("\n");

    const waText = `مرحباً لونيفا فاشون 🌸\nأود تأكيد استفسار طلب الشراء رقم *${orderNumber}*:\nالاسم: ${customerName.trim()}\nالهاتف: ${cleanPhone}\n\nالقطع المختارة:\n${itemsSummary}\n\nالإجمالي التقديري: ${formatMoney(totalEstimated)}\n${notes ? `ملاحظاتي: ${notes}\n` : ""}يرجى التواصل معي لتأكيد الحجز وموعد البروفة/التسليم ✨`;

    const waUrl = generateWhatsAppUrl(adminPhone, waText);

    return NextResponse.json({
      ok: true,
      orderId,
      orderNumber,
      totalEstimated,
      whatsappUrl: waUrl,
    });
  } catch (error) {
    console.error("Failed to create customer order inquiry:", error);
    return NextResponse.json({ ok: false, error: "تعذر إرسال الطلب حالياً." }, { status: 500 });
  }
}
