"use client";

import { ArrowLeft, Check, Loader2, Mail, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.error || "تعذّر تسجيل البريد. حاولي مرة أخرى.");
        return;
      }
      setStatus("success");
      setFeedback(data.message || "تم تسجيل بريدك بنجاح.");
      setEmail("");
      setWebsite("");
    } catch {
      setStatus("error");
      setFeedback("تعذّر الاتصال بالخادم. حاولي بعد قليل.");
    }
  }

  return (
    <form className="luniva-newsletter" onSubmit={onSubmit}>
      <div className="luniva-newsletter__glow luniva-newsletter__glow--brand" aria-hidden="true" />
      <div className="luniva-newsletter__glow luniva-newsletter__glow--lav" aria-hidden="true" />

      <div className="luniva-newsletter__copy">
        <p className="luniva-newsletter__eyebrow"><Mail size={12} />لونيفا · نشرتك البريدية</p>
        <h2 className="luniva-newsletter__title">ابعلي آخر الأخبار والتشكيلات الجديدة</h2>
        <p className="luniva-newsletter__desc">
          اشتركي بالبريد لتصلي إليكِ العروض والقطع الجديدة قبل الجميع، بدون رسائل زائدة.
        </p>
      </div>

      <div className="luniva-newsletter__controls">
        <div className="luniva-newsletter__field">
          <input
            type="email"
            dir="ltr"
            required
            maxLength={160}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status !== "idle") {
                setStatus("idle");
                setFeedback("");
              }
            }}
            placeholder="name@example.com"
            aria-label="البريد الإلكتروني للاشتراك في النشرة"
            className="luniva-newsletter__input"
          />
        </div>
        <button type="submit" disabled={status === "sending"} className="luniva-newsletter__button">
          {status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {status === "sending" ? "جارٍ التسجيل..." : "اشترك الآن"}
          {status !== "sending" && <ArrowLeft size={14} aria-hidden="true" />}
        </button>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="newsletter-website">موقع الويب</label>
        <input
          id="newsletter-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className="luniva-newsletter__feedback"
        data-tone={status === "error" ? "error" : "success"}
      >
        {feedback && (
          <>
            {status === "success" ? <Check size={13} aria-hidden="true" /> : null}
            {feedback}
          </>
        )}
      </p>
    </form>
  );
}
