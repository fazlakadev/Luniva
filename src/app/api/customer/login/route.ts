import { NextResponse } from "next/server";
import { db, ensureCustomersTable } from "@/lib/db";
import { setCustomerSessionCookie, verifyCustomerPassword } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureCustomersTable();
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier?.trim()) {
      return NextResponse.json({ ok: false, error: "يرجى إدخال رقم الهاتف أو البريد الإلكتروني." }, { status: 400 });
    }

    const clean = identifier.trim();
    const isEmail = clean.includes("@");

    let res;
    if (isEmail) {
      res = await db.query(
        "SELECT id, full_name, phone, email, password_hash, customer_code, image_url FROM customers WHERE LOWER(email) = $1 LIMIT 1",
        [clean.toLowerCase()],
      );
    } else {
      res = await db.query(
        `SELECT c.id, c.full_name, c.phone, c.email, c.password_hash, c.customer_code, c.image_url
         FROM customers c
         LEFT JOIN customer_phones cp ON cp.customer_id = c.id
         WHERE c.phone = $1 OR cp.phone = $1
         LIMIT 1`,
        [clean],
      );
    }

    if (!res.rowCount || !res.rows[0]) {
      return NextResponse.json(
        { ok: false, error: "لم يتم العثور على حساب بهذا الرقم أو البريد. يمكنكِ إنشاء حساب جديد خلال ثوانٍ." },
        { status: 404 },
      );
    }

    const customer = res.rows[0];

    // If customer has a password set, verify it (unless quick phone login where password not set)
    if (customer.password_hash && password) {
      const match = await verifyCustomerPassword(password, customer.password_hash);
      if (!match) {
        return NextResponse.json({ ok: false, error: "كلمة المرور غير صحيحة." }, { status: 401 });
      }
    }

    const sessionPayload = {
      customerId: customer.id,
      fullName: customer.full_name,
      phone: customer.phone || "",
      email: customer.email,
      customerCode: customer.customer_code,
      imageUrl: customer.image_url,
    };

    await setCustomerSessionCookie(sessionPayload);

    return NextResponse.json({ ok: true, customer: sessionPayload });
  } catch (error) {
    console.error("Customer login failed:", error);
    return NextResponse.json({ ok: false, error: "تعذر تسجيل الدخول حالياً." }, { status: 500 });
  }
}
