import { NextResponse } from "next/server";
import { db, ensureCustomersTable } from "@/lib/db";
import { hashCustomerPassword, setCustomerSessionCookie } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureCustomersTable();
    const body = await request.json();
    const { fullName, phone, email, password, address } = body;

    if (!fullName?.trim()) {
      return NextResponse.json({ ok: false, error: "اسم العميلة مطلوب." }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ ok: false, error: "رقم الهاتف مطلوب للتواصل وتأكيد الحجز." }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;

    // Check if customer with this phone already exists
    const existingPhone = await db.query(
      `SELECT c.id, c.full_name, c.phone, c.email, c.customer_code, c.image_url
       FROM customers c
       LEFT JOIN customer_phones cp ON cp.customer_id = c.id
       WHERE c.phone = $1 OR cp.phone = $1
       LIMIT 1`,
      [cleanPhone],
    );

    let customerId: string;
    let customerCode: string | null = null;
    let passwordHash: string | null = null;
    if (password && password.length >= 6) {
      passwordHash = await hashCustomerPassword(password);
    }

    if (existingPhone.rowCount && existingPhone.rows[0]) {
      const existing = existingPhone.rows[0];
      customerId = existing.id;
      customerCode = existing.customer_code;

      // Update info if provided
      await db.query(
        `UPDATE customers
         SET full_name = COALESCE(NULLIF($1, ''), full_name),
             email = COALESCE(NULLIF($2, ''), email),
             address = COALESCE(NULLIF($3, ''), address),
             password_hash = COALESCE($4, password_hash)
         WHERE id = $5`,
        [fullName.trim(), cleanEmail, address?.trim() || null, passwordHash, customerId],
      );
    } else {
      // Create new customer
      const codeSeqRes = await db.query("SELECT nextval('customers_code_seq') AS next_code");
      const nextSeq = codeSeqRes.rows[0]?.next_code || Math.floor(1000 + Math.random() * 9000);
      customerCode = `CUST-${nextSeq}`;

      const insertRes = await db.query(
        `INSERT INTO customers
          (full_name, phone, email, password_hash, address, customer_code, auth_provider)
         VALUES ($1, $2, $3, $4, $5, $6, 'local')
         RETURNING id`,
        [fullName.trim(), cleanPhone, cleanEmail, passwordHash, address?.trim() || null, customerCode],
      );
      customerId = insertRes.rows[0].id;

      // Ensure inserted in customer_phones
      await db.query(
        "INSERT INTO customer_phones (customer_id, phone) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING",
        [customerId, cleanPhone],
      );
    }

    const sessionPayload = {
      customerId,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      customerCode,
      imageUrl: null,
    };

    await setCustomerSessionCookie(sessionPayload);

    return NextResponse.json({ ok: true, customer: sessionPayload });
  } catch (error) {
    console.error("Customer registration failed:", error);
    return NextResponse.json({ ok: false, error: "تعذر إنشاء الحساب حالياً." }, { status: 500 });
  }
}
