import { NextResponse } from "next/server";
import { maskEmail, normalizeEmail, setAdminEmail } from "@/lib/admin-email";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { verifyOtpChallenge } from "@/lib/otp";

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
      purpose: "email_new",
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

    const nextEmail = normalizeEmail(result.pendingEmail ?? result.email);
    if (!nextEmail) return bad("البريد الجديد غير صالح.");

    try {
      await setAdminEmail(nextEmail, session.userId);
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        return bad("هذا البريد مستخدم بحساب آخر. اختاري بريدًا مختلفًا.");
      }
      throw error;
    }

    await logActivity({
      entityType: "settings",
      entityId: null,
      action: "email_updated",
      summary: "تم تغيير بريد التحقق الخاص بالإدارة بعد تأكيد البريدين.",
      actor: session.name,
    });

    return NextResponse.json({ ok: true, email: nextEmail, masked: maskEmail(nextEmail) });
  } catch (error) {
    console.error("Unable to confirm new email", error);
    return bad("تعذّر حفظ البريد الجديد.", 500);
  }
}
