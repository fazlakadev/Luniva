import { db, ensureInvoiceTables } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_KEY = "newsletter_emails";
const MAX_EMAILS = 5000;
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return Response.json({ error: "يرجى إدخال بريد إلكتروني صحيح." }, { status: 400 });
  }

  try {
    await ensureInvoiceTables();
    const existing = await db.query("SELECT value FROM app_settings WHERE key = $1", [EMAIL_KEY]);
    const raw = existing.rows[0]?.value;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const current = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];

    const emails = new Set(current.map((item) => item.toLowerCase()));
    emails.add(email);
    const next = Array.from(emails).slice(-MAX_EMAILS);

    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [EMAIL_KEY, JSON.stringify(next)],
    );

    return Response.json({ ok: true, message: "شكرًا لاشتراكك! سنرسل لكِ أخبار لونيفا قريبًا." });
  } catch (error) {
    console.error("Newsletter signup failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "تعذّر تسجيل البريد حاليًا. حاولي مرة أخرى بعد قليل." }, { status: 502 });
  }
}
