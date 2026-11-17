import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "luniva_session";
const encoder = new TextEncoder();

type SessionPayload = { userId: string; username: string; name: string };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return encoder.encode(value);
}

export async function createSession(payload: SessionPayload, remembered = false) {
  return new SignJWT(payload)
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
    return { userId: payload.userId, username, name };
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
