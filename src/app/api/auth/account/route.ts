import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  createSession,
  getSession,
  sessionCookie,
  sessionCookieOptions,
} from "@/lib/auth";
import { db, ensureInitialAdmin } from "@/lib/db";

const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{2,79}$/;
const MIN_PASSWORD_LENGTH = 12;

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function updateAccount(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const now = Date.now();
  const record = attempts.get(session.userId);
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      username?: unknown;
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : null;
    const username =
      body.username === undefined || body.username === null || body.username === ""
        ? undefined
        : typeof body.username === "string"
          ? body.username.trim()
          : null;

    if (!currentPassword || currentPassword.length > 200) {
      return NextResponse.json({ error: "أدخلي كلمة المرور الحالية." }, { status: 400 });
    }
    if (username === null || (username !== undefined && !USERNAME_PATTERN.test(username))) {
      return NextResponse.json(
        { error: "اسم المستخدم يجب أن يكون إنجليزيًا (3–80 حرفًا، ويبدأ بحرف)." },
        { status: 400 },
      );
    }
    if (newPassword && (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 200)) {
      return NextResponse.json(
        { error: `كلمة المرور الجديدة يجب أن تكون ${MIN_PASSWORD_LENGTH} حرفًا على الأقل.` },
        { status: 400 },
      );
    }
    if (newPassword && confirmPassword !== null && confirmPassword !== newPassword) {
      return NextResponse.json({ error: "تأكيد كلمة المرور غير مطابق." }, { status: 400 });
    }

    await ensureInitialAdmin();
    const result = await db.query(
      "SELECT id, username, display_name, password_hash FROM users WHERE id = $1",
      [session.userId],
    );
    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "الحساب غير موجود." }, { status: 401 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      attempts.set(session.userId, {
        count: record && record.resetAt > now ? record.count + 1 : 1,
        resetAt: now + WINDOW_MS,
      });
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة." }, { status: 401 });
    }

    if (newPassword && await bcrypt.compare(newPassword, user.password_hash)) {
      return NextResponse.json({ error: "اختاري كلمة مرور جديدة مختلفة عن الحالية." }, { status: 400 });
    }

    const nextUsername = username ?? String(user.username ?? "");
    if (!USERNAME_PATTERN.test(nextUsername)) {
      return NextResponse.json({ error: "اسم المستخدم الحالي غير صالح. حدّثيه باسم إنجليزي." }, { status: 400 });
    }

    if (nextUsername.toLowerCase() !== String(user.username ?? "").toLowerCase()) {
      const taken = await db.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2",
        [nextUsername, user.id],
      );
      if (taken.rowCount) {
        return NextResponse.json({ error: "اسم المستخدم مستخدم بالفعل." }, { status: 409 });
      }
    }

    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : user.password_hash;
    await db.query("UPDATE users SET username = $1, password_hash = $2 WHERE id = $3", [
      nextUsername,
      passwordHash,
      user.id,
    ]);

    attempts.delete(session.userId);

    const displayName = String(user.display_name || "مدير النظام");
    const token = await createSession(
      { userId: user.id, username: nextUsername, name: displayName },
      session.remembered,
    );
    const response = NextResponse.json({
      user: { name: displayName, username: nextUsername },
      passwordChanged: Boolean(newPassword),
    });
    response.cookies.set(sessionCookie.name, token, sessionCookieOptions(session.remembered));
    return response;
  } catch (error) {
    console.error("Account update failed", error);
    return NextResponse.json({ error: "تعذّر تحديث بيانات الحساب حاليًا." }, { status: 500 });
  }
}

export const POST = updateAccount;
export const PUT = updateAccount;
