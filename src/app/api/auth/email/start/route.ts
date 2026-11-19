import { NextResponse } from "next/server";
import { getAdminEmail, maskEmail, normalizeEmail } from "@/lib/admin-email";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { generateOtp, saveOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

const sends = new Map<string, { count: number; resetAt: number }>();
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS = 6;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return bad("يجب تسجيل الدخول أولًا.", 401);

    const now = Date.now();
    const record = sends.get(session.userId);
    if (record && record.resetAt > now && record.count >= MAX_SENDS) {
      return bad("طلبات تغيير بريد كثيرة. انتظري قليلًا ثم حاولي مجددًا.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const nextEmail = normalizeEmail(body.email);
    if (!nextEmail) return bad("أدخلي بريدًا إلكترونيًا صالحًا.");

    const currentEmail = await getAdminEmail();
    if (nextEmail === currentEmail) {
      return bad("البريد الجديد مطابق للبريد الحالي.");
    }

    const taken = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2",
      [nextEmail, session.userId],
    );
    if (taken.rowCount) {
      return bad("هذا البريد مستخدم بحساب آخر. اختاري بريدًا مختلفًا.");
    }

    if (!isMailConfigured()) {
      return bad(
        "تعذّر إرسال رمز التحقق لأن خدمة البريد غير مهيأة. لم يتم تغيير البريد.",
        503,
      );
    }

    const otp = generateOtp("email_current");
    try {
      const { sendOtpEmail } = await import("@/lib/mail");
      await sendOtpEmail({ to: currentEmail, code: otp.code, purpose: "email_current", expiryMinutes: 10 });
    } catch (error) {
      console.error("Unable to send email-change authorization code", error);
      return bad(
        "تعذّر إرسال رمز التحقق إلى بريدك الحالي. لم يتم تغيير البريد — تحققي من اتصال البريد ثم حاولي مجددًا.",
        503,
      );
    }

    const challenge = await saveOtpChallenge({
      purpose: "email_current",
      email: currentEmail,
      otp,
      userId: session.userId,
      pendingEmail: nextEmail,
    });

    sends.set(session.userId, {
      count: record && record.resetAt > now ? record.count + 1 : 1,
      resetAt: record && record.resetAt > now ? record.resetAt : now + SEND_WINDOW_MS,
    });

    return NextResponse.json({
      stage: "current",
      challengeId: challenge.id,
      token: challenge.token,
      email: maskEmail(currentEmail),
      nextEmail: maskEmail(nextEmail),
      expiresAt: otp.expiresAt.toISOString(),
      resendAfter: 25,
    });
  } catch (error) {
    console.error("Unable to start email change", error);
    return bad("تعذّر بدء تغيير البريد.", 500);
  }
}
