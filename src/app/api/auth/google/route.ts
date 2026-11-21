import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/catalog";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 500 });
  }

  // Determine redirect URI: use current origin's callback endpoint
  // Or check if GOOGLE_CALLBACK_URL matches current host
  const callbackUrl = new URL("/api/auth/google/callback", origin).toString();

  const state = Buffer.from(JSON.stringify({ returnTo, callbackUrl })).toString("base64");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", callbackUrl);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(googleAuthUrl.toString());
}
