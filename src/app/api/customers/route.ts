import { NextResponse } from "next/server";
import { db, ensureCustomersTable } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadImage } from "@/lib/upload";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    await ensureCustomersTable();
    const result = await db.query(
      "SELECT id, full_name, phone, customer_code, address, image_url, created_at FROM customers ORDER BY created_at DESC",
    );
    return NextResponse.json({ customers: result.rows });
  } catch (error) {
    console.error("Unable to load customers", error);
    return NextResponse.json({ error: "تعذر تحميل قائمة العملاء." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
    const formData = await request.formData();
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const morePhones = String(formData.get("morePhones") ?? "").split(/[\n,،]/).map((value) => value.trim()).filter(Boolean);
    const phones = [...new Set([phone, ...morePhones])];
    const address = String(formData.get("address") ?? "").trim();
    const photo = formData.get("photo");

    if (!fullName || !phone || phones.some((value) => value.length > 32)) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف مطلوبان." }, { status: 400 });
    }

    const imageUrl = await uploadImage(photo);

    await ensureCustomersTable();
    const duplicate = await db.query("SELECT phone FROM customer_phones WHERE phone = ANY($1::text[])", [phones]);
    if (duplicate.rowCount) return NextResponse.json({ error: `رقم الهاتف ${duplicate.rows[0].phone} مسجل بالفعل لعميلة أخرى.` }, { status: 409 });
    const client = await db.connect();
    let result;
    try { await client.query("BEGIN"); result = await client.query(`INSERT INTO customers (full_name, phone, address, image_url, customer_code) VALUES ($1, $2, $3, $4, CONCAT('LNV-C-', LPAD(nextval('customers_code_seq')::text, 5, '0'))) RETURNING id, full_name, phone, customer_code, address, image_url, created_at`, [fullName, phone, address || null, imageUrl]); for (const value of phones) await client.query("INSERT INTO customer_phones (customer_id, phone) VALUES ($1, $2)", [result.rows[0].id, value]); await client.query("COMMIT"); } catch (saveError) { await client.query("ROLLBACK"); throw saveError; } finally { client.release(); }
    return NextResponse.json({ customer: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Unable to create customer", error);
    const message = error instanceof Error ? error.message : "تعذر حفظ العميل.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
