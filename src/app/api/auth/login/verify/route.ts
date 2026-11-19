import { NextResponse } from "next/server";
import { createSession, sessionCookie, sessionCookieOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOtpPurpose, verifyOtpChallenge } from "@/lib/otp";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const key = getClientKey(request);
  const now = Date.now();
  const record = attempts.get(key);
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "محاولات تحقق كثيرة. حاولي مرة أخرى بعد 15 دقيقة." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
    const purpose = body.purpose ?? "login";

    if (!challengeId || !token || !isOtpPurpose(purpose) || purpose !== "login") {
      return NextResponse.json({ error: "طلب تحقق غير صالح." }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ error: "أدخلي رمز التحقق المكوّن من 6 أرقام." }, { status: 400 });
    }

    const result = await verifyOtpChallenge({ id: challengeId, token, code, purpose });
    if (!result.ok) {
      attempts.set(key, {
        count: record && record.resetAt > now ? record.count + 1 : 1,
        resetAt: now + WINDOW_MS,
      });
      if (result.reason === "expired") {
        return NextResponse.json(
          { error: "انتهت صلاحية الرمز. اطلبي رمزًا جديدًا.", code: "expired" },
          { status: 410 },
        );
      }
      if (result.reason === "locked") {
        return NextResponse.json(
          { error: "تم إيقاف هذا الرمز بعد محاولات خاطئة كثيرة. اطلبي رمزًا جديدًا.", code: "locked" },
          { status: 423 },
        );
      }
      return NextResponse.json({ error: "الرمز غير صحيح. تحققي منه وحاولي مجددًا.", code: "invalid" }, { status: 401 });
    }

    if (!result.userId) {
      return NextResponse.json({ error: "تعذّر التحقق من الحساب." }, { status: 401 });
    }

    const userResult = await db.query(
      "SELECT id, username, display_name FROM users WHERE id = $1",
      [result.userId],
    );
    const user = userResult.rows[0];
    if (!user) {
      return NextResponse.json({ error: "تعذّر العثور على الحساب." }, { status: 401 });
    }

    attempts.delete(key);
    const displayName = String(user.display_name || user.username || "مدير النظام");
    const session = await createSession(
      { userId: user.id, username: user.username, name: displayName },
      result.remember,
    );

    const response = NextResponse.json({ user: { name: displayName, username: user.username } });
    response.cookies.set(sessionCookie.name, session, sessionCookieOptions(result.remember));
    return response;
  } catch (error) {
    console.error("OTP verification failed", error);
    return NextResponse.json({ error: "تعذّر التحقق من الرمز حاليًا." }, { status: 500 });
  }
}
