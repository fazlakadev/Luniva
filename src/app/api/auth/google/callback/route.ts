import { NextResponse } from "next/server";
import { findOrCreateGoogleCustomer, setCustomerSessionCookie } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateRaw = searchParams.get("state");

  let returnTo = "/catalog";
  let stateCallbackUrl = "";
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf8"));
      if (decoded.returnTo) returnTo = decoded.returnTo;
      if (decoded.callbackUrl) stateCallbackUrl = decoded.callbackUrl;
    } catch {
      // ignore
    }
  }

  if (error || !code) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("تم إلغاء تسجيل الدخول بجوجل.")}`, origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=oauth_config_missing", origin));
  }

  const redirectUri = stateCallbackUrl || new URL("/api/auth/google/callback", origin).toString();

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", origin));
    }

    // 2. Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.sub || !profile.email) {
      console.error("Google user profile fetch failed:", profile);
      return NextResponse.redirect(new URL("/login?error=profile_fetch_failed", origin));
    }

    // 3. Find or create customer
    const customer = await findOrCreateGoogleCustomer({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name || profile.given_name || "عميلة لونيفا",
      picture: profile.picture || null,
    });

    // 4. Set session cookie
    await setCustomerSessionCookie(customer);

    return NextResponse.redirect(new URL(returnTo, origin));
  } catch (err) {
    console.error("Google OAuth callback exception:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", origin));
  }
}
