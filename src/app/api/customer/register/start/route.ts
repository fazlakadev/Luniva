import { NextResponse } from "next/server";
import { db, ensureCustomersTable } from "@/lib/db";
import { isMailConfigured, sendOtpEmail } from "@/lib/mail";
import { generateOtp, saveOtpChallenge } from "@/lib/otp";
import { maskEmail, normalizeEmail } from "@/lib/admin-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensureCustomersTable();
    const body = await request.json().catch(() => ({}));
    const { fullName, phone, email, password, address } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ ok: false, error: "اسم العميلة مطلوب." }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ ok: false, error: "رقم الهاتف مطلوب للتواصل وتأكيد الحجز." }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: "يرجى إدخال بريد إلكتروني صالح لاستلام رمز التحقق وتأكيد الحساب." }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check if phone or email is already registered
    const existing = await db.query(
      `SELECT id, email, phone FROM customers WHERE LOWER(email) = LOWER($1) OR phone = $2 LIMIT 1`,
      [cleanEmail, cleanPhone],
    );

    if (existing.rowCount && existing.rows[0]) {
      const match = existing.rows[0];
      if (match.email && match.email.toLowerCase() === cleanEmail) {
        return NextResponse.json(
          { ok: false, error: "هذا البريد مسجل بالفعل. يمكنكِ تسجيل الدخول مباشرة بدلاً من إنشاء حساب جديد." },
          { status: 409 },
        );
      }
      if (match.phone === cleanPhone) {
        return NextResponse.json(
          { ok: false, error: "رقم الهاتف هذا مسجل بالفعل بحساب عميلة آخر. يمكنكِ تسجيل الدخول." },
          { status: 409 },
        );
      }
    }

    if (!isMailConfigured()) {
      return NextResponse.json(
        { ok: false, error: "خدمة إرسال البريد غير مهيأة حالياً. يرجى المحاولة لاحقاً." },
        { status: 503 },
      );
    }

    // Generate OTP
    const otp = generateOtp("customer_register");

    try {
      await sendOtpEmail({
        to: cleanEmail,
        code: otp.code,
        purpose: "customer_register",
        expiryMinutes: 15,
      });
    } catch (mailErr) {
      console.error("Failed to send customer registration OTP:", mailErr);
      const detail = mailErr instanceof Error ? `: ${mailErr.message}` : "";
      return NextResponse.json(
        { ok: false, error: `تعذر إرسال رمز التحقق إلى بريدكِ (${cleanEmail})${detail}. يرجى التحقق من صحته والمحاولة ثانية.` },
        { status: 502 },
      );
    }

    const challenge = await saveOtpChallenge({
      purpose: "customer_register",
      email: cleanEmail,
      otp,
      metadata: JSON.stringify({
        fullName: fullName.trim(),
        phone: cleanPhone,
        password: password || "",
        address: address?.trim() || "",
      }),
    });

    return NextResponse.json({
      ok: true,
      challengeId: challenge.id,
      token: challenge.token,
      email: maskEmail(cleanEmail),
      rawEmail: cleanEmail,
      expiresAt: otp.expiresAt.toISOString(),
      resendAfter: 25,
    });
  } catch (error) {
    console.error("Customer register start error:", error);
    return NextResponse.json({ ok: false, error: "تعذر بدء عملية إنشاء الحساب." }, { status: 500 });
  }
}
