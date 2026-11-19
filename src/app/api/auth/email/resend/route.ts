import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isOtpPurpose, refreshOtpChallenge } from "@/lib/otp";

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
    const purpose = body.purpose;
    if (!challengeId || !token || !isOtpPurpose(purpose) || purpose === "login") {
      return bad("طلب غير صالح.");
    }

    const result = await refreshOtpChallenge({
      id: challengeId,
      token,
      purpose,
      userId: session.userId,
    });
    if (!result.ok) {
      if (result.reason === "expired") {
        return NextResponse.json({ error: "انتهت صلاحية الجلسة. ابدئي من جديد.", code: "expired" }, { status: 410 });
      }
      if (result.reason === "rate") {
        return NextResponse.json({ error: "انتظري قليلًا قبل طلب رمز جديد.", code: "rate" }, { status: 429 });
      }
      return bad("تعذّر إعادة إرسال الرمز.");
    }

    return NextResponse.json({ ok: true, expiresAt: result.expiresAt.toISOString(), resendAfter: 25 });
  } catch (error) {
    console.error("Unable to resend email-change OTP", error);
    return bad("تعذّر إرسال رمز جديد لأن خدمة البريد غير متاحة حاليًا.", 503);
  }
}
