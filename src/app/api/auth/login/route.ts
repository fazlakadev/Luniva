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
    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      attempts.set(key, { count: record && record.resetAt > now ? record.count + 1 : 1, resetAt: now + WINDOW_MS });
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة." }, { status: 401 });
    }

    attempts.delete(key);
    const displayName = String(user.display_name || user.username || "مدير النظام");
    const token = await createSession({ userId: user.id, username: user.username, name: displayName }, remember);
    const response = NextResponse.json({ user: { name: displayName, username: user.username } });
    response.cookies.set(sessionCookie.name, token, sessionCookieOptions(remember));
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "تعذر إتمام تسجيل الدخول حاليًا." }, { status: 500 });
  }
}
