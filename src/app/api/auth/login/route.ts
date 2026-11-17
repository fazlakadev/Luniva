import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, sessionCookie, sessionCookieOptions } from "@/lib/auth";
import { db, ensureInitialAdmin } from "@/lib/db";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const key = getClientKey(request);
  const now = Date.now();
  const record = attempts.get(key);
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const remember = body.remember === true;
    if (!email || !password || email.length > 254 || password.length > 200) {
      return NextResponse.json({ error: "أدخلي البريد الإلكتروني وكلمة المرور." }, { status: 400 });
    }

    await ensureInitialAdmin();
    const result = await db.query("SELECT id, email, password_hash, display_name FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      attempts.set(key, { count: record && record.resetAt > now ? record.count + 1 : 1, resetAt: now + WINDOW_MS });
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    attempts.delete(key);
    const token = await createSession({ userId: user.id, email: user.email, name: user.display_name }, remember);
    const response = NextResponse.json({ user: { name: user.display_name, email: user.email } });
    response.cookies.set(sessionCookie.name, token, sessionCookieOptions(remember));
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "تعذر إتمام تسجيل الدخول حاليًا." }, { status: 500 });
  }
}
