import { NextResponse } from "next/server";
import { maskEmail, normalizeEmail } from "@/lib/admin-email";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { generateOtp, saveOtpChallenge, verifyOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return bad("يجب تسجيل الدخول أولًا.", 401);

    const body = await request.json().catch(() => ({}));
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
    if (!challengeId || !token) return bad("طلب تحقق غير صالح.");
    if (code.length !== 6) return bad("أدخلي رمز التحقق المكوّن من 6 أرقام.");

    const result = await verifyOtpChallenge({
      id: challengeId,
      token,
      code,
      purpose: "email_current",
    });
    if (!result.ok) {
      if (result.reason === "expired") {
        return NextResponse.json({ error: "انتهت صلاحية الرمز. ابدئي تغيير البريد من جديد.", code: "expired" }, { status: 410 });
      }
      if (result.reason === "locked") {
        return NextResponse.json({ error: "تم إيقاف هذا الرمز بعد محاولات خاطئة كثيرة. ابدئي من جديد.", code: "locked" }, { status: 423 });
      }
      return NextResponse.json({ error: "الرمز غير صحيح.", code: "invalid" }, { status: 401 });
    }

    if (result.userId !== session.userId) {
      return bad("تعذّر التحقق من الحساب.", 401);
    }

    const pendingEmail = normalizeEmail(result.pendingEmail);
    if (!pendingEmail) return bad("البريد الجديد غير صالح. ابدئي من جديد.");

    const taken = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2",
      [pendingEmail, session.userId],
    );
    if (taken.rowCount) return bad("هذا البريد أصبح مستخدمًا بحساب آخر. اختاري بريدًا مختلفًا.");

    if (!isMailConfigured()) {
      return bad("تعذّر إرسال رمز التأكيد لأن خدمة البريد غير مهيأة. لم يتم تغيير البريد.", 503);
    }

    const otp = generateOtp("email_new");
    try {
      const { sendOtpEmail } = await import("@/lib/mail");
      await sendOtpEmail({ to: pendingEmail, code: otp.code, purpose: "email_new", expiryMinutes: 15 });
    } catch (error) {
      console.error("Unable to send new-email confirmation code", error);
      return bad("تعذّر إرسال رمز التأكيد إلى البريد الجديد. لم يتم تغيير البريد.", 503);
    }

    const challenge = await saveOtpChallenge({
      purpose: "email_new",
      email: pendingEmail,
      otp,
      userId: session.userId,
      pendingEmail,
    });

    return NextResponse.json({
      stage: "new",
      challengeId: challenge.id,
      token: challenge.token,
      email: maskEmail(pendingEmail),
      expiresAt: otp.expiresAt.toISOString(),
      resendAfter: 25,
    });
  } catch (error) {
    console.error("Unable to verify current email", error);
    return bad("تعذّر التحقق من البريد الحالي.", 500);
  }
}
