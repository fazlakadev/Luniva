import { NextResponse } from "next/server";
import { refreshOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!challengeId || !token) {
      return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
    }

    const result = await refreshOtpChallenge({ id: challengeId, token, purpose: "login" });
    if (!result.ok) {
      if (result.reason === "expired") {
        return NextResponse.json(
          { error: "انتهت صلاحية الجلسة. سجّلي الدخول من جديد.", code: "expired" },
          { status: 410 },
        );
      }
      if (result.reason === "rate") {
        return NextResponse.json(
          { error: "انتظري قليلًا قبل طلب رمز جديد.", code: "rate" },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: "تعذّر إعادة إرسال الرمز." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, expiresAt: result.expiresAt.toISOString(), resendAfter: 25 });
  } catch (error) {
    console.error("Unable to resend login OTP", error);
    return NextResponse.json(
      { error: "تعذّر إرسال رمز جديد لأن خدمة البريد غير متاحة حاليًا. حاولي مجددًا." },
      { status: 503 },
    );
  }
}
