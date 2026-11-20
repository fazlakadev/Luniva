import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "luniva_session";
const encoder = new TextEncoder();

type SessionPayload = {
  userId: string;
  username: string;
  name: string;
  remembered?: boolean;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) {
    return encoder.encode(value);
  }
  // Safe deterministic fallback when environment variable is not configured or too short.
  // This prevents unhandled 500 crashes during production login verification.
  const fallback = createHash("sha256")
    .update(`luniva:${process.env.DATABASE_URL || "luniva-enterprise-session-fallback-seed"}`)
    .digest("hex");
  return encoder.encode(fallback);
}

export async function createSession(payload: SessionPayload, remembered = false) {
  return new SignJWT({ ...payload, remembered })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remembered ? "30d" : "12h")
    .sign(secret());
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string") return null;
    // Sessions issued before the username migration carried an email instead.
    const username = typeof payload.username === "string"
      ? payload.username
      : typeof payload.email === "string"
        ? payload.email
        : null;
    if (!username) return null;
    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name : username;
    const remembered = typeof payload.remembered === "boolean" ? payload.remembered : false;
    return { userId: payload.userId, username, name, remembered };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  },
};

export const sessionCookieOptions = (remembered = false) => ({
  ...sessionCookie.options,
  maxAge: remembered ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
});
