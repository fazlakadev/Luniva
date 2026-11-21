import { NextResponse } from "next/server";
import { refreshOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!challengeId || !token) {
      return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
    }

    const result = await refreshOtpChallenge({
      id: challengeId,
      token,
      purpose: "customer_register",
    });

    if (!result.ok) {
      if (result.reason === "expired") {
        return NextResponse.json({ ok: false, error: "انتهت صلاحية الجلسة، ابدئي من جديد.", code: "expired" }, { status: 410 });
      }
      if (result.reason === "rate") {
        return NextResponse.json({ ok: false, error: "انتظري قليلاً قبل طلب رمز جديد.", code: "rate" }, { status: 429 });
      }
      return NextResponse.json({ ok: false, error: "تعذر إعادة إرسال الرمز حالياً." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, expiresAt: result.expiresAt.toISOString(), resendAfter: 25 });
  } catch (error) {
    console.error("Customer resend register OTP error:", error);
    return NextResponse.json({ ok: false, error: "تعذر إعادة إرسال رمز التحقق." }, { status: 500 });
  }
}
