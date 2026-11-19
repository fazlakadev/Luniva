import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminEmail, maskEmail } from "@/lib/admin-email";
import { db, ensureInitialAdmin } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { generateOtp, saveOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const sends = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 6;
const SEND_WINDOW_MS = 10 * 60 * 1000;

function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const key = getClientKey(request);
  const now = Date.now();
  const record = attempts.get(key);
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "محاولات كثيرة. حاولي مرة أخرى بعد 15 دقيقة." }, { status: 429 });
  }

  const sendRecord = sends.get(key);
  if (sendRecord && sendRecord.resetAt > now && sendRecord.count >= MAX_SENDS) {
    return NextResponse.json(
      { error: "تم إرسال رموز كثيرة. انتظري قليلًا ثم حاولي مرة أخرى." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const remember = body.remember === true;
    if (!username || !password || username.length > 80 || password.length > 200) {
      return NextResponse.json({ error: "أدخلي اسم المستخدم وكلمة المرور." }, { status: 400 });
    }

    await ensureInitialAdmin();
    const result = await db.query(
      "SELECT id, username, password_hash, display_name FROM users WHERE LOWER(username) = LOWER($1)",
      [username],
    );
    const user = result.rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      attempts.set(key, {
        count: record && record.resetAt > now ? record.count + 1 : 1,
        resetAt: now + WINDOW_MS,
      });
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    // Credentials are valid. From here the only way in is a verified code, so a
    // mail outage must block login outright instead of silently letting anyone in.
    if (!isMailConfigured()) {
      console.error("Admin login blocked: SMTP is not configured.");
      return NextResponse.json(
        {
          error:
            "تعذّر إرسال رمز التحقق لأن خدمة البريد غير مهيأة. تم إيقاف تسجيل الدخول لحماية الحساب — راجعي إعدادات البريد ثم حاولي مجددًا.",
        },
        { status: 503 },
      );
    }

    const email = await getAdminEmail();
    const otp = generateOtp("login");

    try {
      // Imported lazily so a missing SMTP configuration never crashes the route.
      const { sendOtpEmail } = await import("@/lib/mail");
      await sendOtpEmail({ to: email, code: otp.code, purpose: "login", expiryMinutes: 10 });
    } catch (mailError) {
      console.error("Admin login blocked: unable to send OTP email.", mailError);
      return NextResponse.json(
        {
          error:
            "تعذّر إرسال رمز التحقق إلى بريد الإدارة. تم إيقاف تسجيل الدخول لحماية الحساب — تحققي من اتصال البريد ثم حاولي مجددًا.",
        },
        { status: 503 },
      );
    }

    const challenge = await saveOtpChallenge({
      purpose: "login",
      email,
      otp,
      userId: user.id,
      remember,
    });

    attempts.delete(key);
    sends.set(key, {
      count: sendRecord && sendRecord.resetAt > now ? sendRecord.count + 1 : 1,
      resetAt: sendRecord && sendRecord.resetAt > now ? sendRecord.resetAt : now + SEND_WINDOW_MS,
    });

    return NextResponse.json({
      stage: "otp",
      challengeId: challenge.id,
      token: challenge.token,
      email: maskEmail(email),
      expiresAt: otp.expiresAt.toISOString(),
      resendAfter: 25,
    });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "تعذّر إتمام تسجيل الدخول حاليًا." }, { status: 500 });
  }
}
