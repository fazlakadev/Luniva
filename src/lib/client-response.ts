/**
 * Server errors are JSON, but proxies and hosting platforms can answer with
 * plain text (for example `Request Entity Too Large` on a 413). Parsing those
 * bodies with `response.json()` throws a raw V8 SyntaxError that reaches the
 * UI. Always read API responses through this helper so the user sees a clear
 * Arabic message instead.
 */
const GENERIC_MESSAGE = "تعذر قراءة استجابة الخادم. حاولي مرة أخرى.";

export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const preview = (await response.text().catch(() => "")).slice(0, 120).trim();
    if (/request entity too large|payload too large|413/i.test(preview)) {
      throw new Error("حجم الصور المرفقة كبير جدًا. استخدمي صورًا أصغر أو قلّلي عدد المتغيرات التي لها صور.");
    }
    throw new Error(GENERIC_MESSAGE);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(GENERIC_MESSAGE);
  }
}
