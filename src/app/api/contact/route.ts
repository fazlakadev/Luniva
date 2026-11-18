import { isContactMailConfigured, sendContactEmail } from "@/lib/mail";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 3;
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
      if (!timestamps.some((timestamp) => now - timestamp < RATE_WINDOW_MS)) {
        attempts.delete(storedKey);
      }
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
    return Response.json({ ok: true, message: "تم إرسال رسالتك بنجاح." });
  }

  if (!allowRequest(clientKey(request))) {
    return Response.json(
      { error: "تم إرسال عدة رسائل من نفس الاتصال. حاولي مرة أخرى بعد قليل." },
      { status: 429 },
    );
  }

  const name = asText(payload.name);
  const email = asText(payload.email);
  const phone = asText(payload.phone);
  const subject = asText(payload.subject);
  const message = asText(payload.message);

  if (name.length < 2 || name.length > 80) {
    return Response.json({ error: "يرجى إدخال اسم صحيح (٢ إلى ٨٠ حرفًا)." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return Response.json({ error: "يرجى إدخال بريد إلكتروني صحيح." }, { status: 400 });
  }
  if (phone.length > 40) {
    return Response.json({ error: "رقم الهاتف طويل جدًا." }, { status: 400 });
  }
  if (subject.length > 140) {
    return Response.json({ error: "الموضوع طويل جدًا." }, { status: 400 });
  }
  if (message.length < 10 || message.length > 3000) {
    return Response.json({ error: "يرجى كتابة رسالة من ١٠ إلى ٣٠٠٠ حرف." }, { status: 400 });
  }

  if (!isContactMailConfigured()) {
    return Response.json(
      { error: "خدمة البريد غير مفعّلة حاليًا. يرجى التواصل معنا عبر البريد الظاهر في الصفحة." },
      { status: 503 },
    );
  }

  try {
    await sendContactEmail({ name, email, phone, subject, message });
    return Response.json({ ok: true, message: "تم إرسال رسالتك بنجاح. سنرد عليك في أقرب وقت." });
  } catch (error) {
    console.error("Contact form email failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json(
      { error: "تعذّر إرسال الرسالة حاليًا. حاولي مرة أخرى بعد قليل أو راسلينا مباشرة." },
      { status: 502 },
    );
  }
}
