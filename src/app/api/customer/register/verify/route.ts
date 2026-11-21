import { NextResponse } from "next/server";
import { db, ensureCustomersTable } from "@/lib/db";
import { hashCustomerPassword, setCustomerSessionCookie } from "@/lib/customer-auth";
import { verifyOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureCustomersTable();
    const body = await request.json().catch(() => ({}));
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";

    if (!challengeId || !token) {
      return NextResponse.json({ ok: false, error: "طلب تحقق غير صالح." }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ ok: false, error: "أدخلي رمز التحقق المكوّن من 6 أرقام." }, { status: 400 });
    }

    const result = await verifyOtpChallenge({
      id: challengeId,
      token,
      code,
      purpose: "customer_register",
    });

    if (!result.ok) {
      if (result.reason === "expired") {
        return NextResponse.json({ ok: false, error: "انتهت صلاحية الرمز. يرجى البدء من جديد.", code: "expired" }, { status: 410 });
      }
      if (result.reason === "locked") {
        return NextResponse.json({ ok: false, error: "تم إيقاف هذا الرمز بعد محاولات خاطئة كثيرة. ابدئي من جديد.", code: "locked" }, { status: 423 });
      }
      return NextResponse.json({ ok: false, error: "الرمز غير صحيح، يرجى التأكد وإعادة المحاولة.", code: "invalid" }, { status: 401 });
    }

    // Parse registration metadata
    let meta: { fullName?: string; phone?: string; password?: string; address?: string } = {};
    try {
      meta = result.metadata ? JSON.parse(result.metadata) : {};
    } catch {
      meta = {};
    }

    const fullName = meta.fullName?.trim() || "عميلة لونيفا";
    const phone = meta.phone?.trim() || "";
    const email = result.email.trim().toLowerCase();
    const password = meta.password || "";
    const address = meta.address?.trim() || null;

    let passwordHash: string | null = null;
    if (password && password.length >= 6) {
      passwordHash = await hashCustomerPassword(password);
    }

    // Generate next customer code
    const codeSeqRes = await db.query("SELECT nextval('customers_code_seq') AS next_code");
    const nextSeq = codeSeqRes.rows[0]?.next_code || Math.floor(1000 + Math.random() * 9000);
    const customerCode = `CUST-${nextSeq}`;

    // Insert customer record
    const insertRes = await db.query(
      `INSERT INTO customers
        (full_name, phone, email, password_hash, address, customer_code, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, 'email_verified')
       RETURNING id, full_name, phone, email, customer_code, image_url`,
      [fullName, phone, email, passwordHash, address, customerCode],
    );

    const newCustomer = insertRes.rows[0];

    // Ensure phone record in customer_phones
    if (phone) {
      await db.query(
        "INSERT INTO customer_phones (customer_id, phone) VALUES ($1, $2) ON CONFLICT (phone) DO NOTHING",
        [newCustomer.id, phone],
      );
    }

    const sessionPayload = {
      customerId: newCustomer.id,
      fullName: newCustomer.full_name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      customerCode: newCustomer.customer_code,
      imageUrl: newCustomer.image_url,
    };

    await setCustomerSessionCookie(sessionPayload);

    return NextResponse.json({
      ok: true,
      customer: sessionPayload,
      message: "تم تفعيل وتأكيد حسابكِ بنجاح! أهلاً بكِ في لونيفا ✨",
    });
  } catch (error) {
    console.error("Customer register verify error:", error);
    return NextResponse.json({ ok: false, error: "تعذر إتمام التحقق وإنشاء الحساب." }, { status: 500 });
  }
}
