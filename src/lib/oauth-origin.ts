export function getCanonicalOrigin(request: Request): string {
  // 1. If explicit app URL is set in env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl && !appUrl.includes("localhost")) {
    return appUrl.replace(/\/$/, "");
  }

  // 2. Check proxy headers from Vercel / Cloudflare / reverse proxies
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (host) {
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    // For non-localhost, ALWAYS enforce https so Google OAuth doesn't fail with redirect_uri_mismatch
    const proto = isLocal ? (forwardedProto || "http") : "https";
    return `${proto}://${host}`;
  }

  // 3. Fallback to request.url
  const parsed = new URL(request.url);
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const proto = isLocal ? parsed.protocol.replace(":", "") : "https";
  return `${proto}://${parsed.host}`;
}

export function getGoogleCallbackUrl(request: Request): string {
  const origin = getCanonicalOrigin(request);

  if (process.env.GOOGLE_CALLBACK_URL) {
    try {
      const parsedEnvUrl = new URL(process.env.GOOGLE_CALLBACK_URL);
      const parsedOrigin = new URL(origin);
      if (parsedEnvUrl.host === parsedOrigin.host) {
        return process.env.GOOGLE_CALLBACK_URL;
      }
    } catch {
      // ignore
    }
  }

  return `${origin}/api/auth/google/callback`;
}
