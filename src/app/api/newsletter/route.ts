import { subscribeNewsletter } from "@/lib/newsletter";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const attempts = new Map<string, number[]>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function allowRequest(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 500) {
    for (const [storedKey, timestamps] of attempts) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_WINDOW_MS)) attempts.delete(storedKey);
    }
  }
  return true;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "بيانات النموذج غير صحيحة." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Honeypot: real visitors never fill this hidden field.
  if (asText(payload.website)) {
    return Response.json({ ok: true, message: "تم تسجيل بريدك بنجاح." });
  }

  if (!allowRequest(clientKey(request))) {
    return Response.json({ error: "تم إرسال طلبات كثيرة من نفس الاتصال. حاولي بعد قليل." }, { status: 429 });
  }

  const email = asText(payload.email).toLowerCase();
  const source = asText(payload.source) || "storefront";

  try {
    await subscribeNewsletter(email, source);
    return Response.json({
      ok: true,
      message: "شكرًا لاشتراككِ في نادي لونيفا! ستصلكِ أحدث التشكيلات والعروض الحصرية فور إطلاقها.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "تعذّر تسجيل البريد حاليًا.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
