"use client";

import { AlertCircle, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const EMPTY_FORM: FormValues = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (status !== "success") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setStatus("idle");
      setFeedback("");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status]);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (status === "success" || status === "error") {
      setStatus("idle");
      setFeedback("");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };

      if (!response.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.error || "تعذّر إرسال الرسالة. حاولي مرة أخرى.");
        return;
      }

      setStatus("success");
      setFeedback(data.message || "تم إرسال رسالتك بنجاح.");
      setValues(EMPTY_FORM);
      setWebsite("");
    } catch {
      setStatus("error");
      setFeedback("تعذّر الاتصال بالخادم. حاولي مرة أخرى بعد قليل.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="app-card min-w-0 p-5 sm:p-7" noValidate={false}>
      <div className="mb-6 flex items-start gap-3">
        <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <Send size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">أرسلي رسالتك</h2>
          <p className="mt-1 text-[11px] leading-6 muted">املئي البيانات وسنصلك في أقرب وقت ممكن.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="contact-name" className="field-label">الاسم الكامل <span style={{ color: "var(--danger)" }}>*</span></label>
          <input
            id="contact-name"
            name="name"
            className="field"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="مثال: مريم أحمد"
            minLength={2}
            maxLength={80}
            required
            disabled={status === "sending"}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-email" className="field-label">البريد الإلكتروني <span style={{ color: "var(--danger)" }}>*</span></label>
          <input
            id="contact-email"
            name="email"
            type="email"
            dir="ltr"
            className="field text-right"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="name@example.com"
            maxLength={120}
            required
            disabled={status === "sending"}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-phone" className="field-label">رقم الهاتف (اختياري)</label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            dir="ltr"
            className="field text-right"
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="01xxxxxxxxx"
            maxLength={40}
            disabled={status === "sending"}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor="contact-subject" className="field-label">الموضوع (اختياري)</label>
          <input
            id="contact-subject"
            name="subject"
            className="field"
            value={values.subject}
            onChange={(event) => update("subject", event.target.value)}
            placeholder="استفسار عن منتج أو فاتورة"
            maxLength={140}
            disabled={status === "sending"}
          />
        </div>

        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="contact-message" className="field-label">الرسالة <span style={{ color: "var(--danger)" }}>*</span></label>
          <textarea
            id="contact-message"
            name="message"
            className="field min-h-[9rem] resize-y"
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="اكتبي رسالتك هنا..."
            minLength={10}
            maxLength={3000}
            required
            disabled={status === "sending"}
          />
          <p className="field-hint" dir="rtl">{values.message.length} / 3000 حرف</p>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">موقع الويب</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold leading-6"
          style={{
            background: status === "error" ? "var(--danger-soft)" : "var(--success-soft)",
            color: status === "error" ? "var(--danger)" : "var(--success)",
            border: `1px solid ${status === "error" ? "color-mix(in srgb, var(--danger) 24%, transparent)" : "color-mix(in srgb, var(--success) 24%, transparent)"}`,
          }}
        >
          {status === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <span className="min-w-0">{feedback}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary mt-6 w-full py-3 text-sm" disabled={status === "sending"}>
        {status === "sending" ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        {status === "sending" ? "جارٍ الإرسال..." : "إرسال الرسالة"}
      </button>

      {status === "success" && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="false"
          aria-labelledby="contact-success-title"
          className="luniva-mail-popup print:hidden"
        >
          <button
            type="button"
            className="luniva-mail-popup__backdrop"
            aria-label="إغلاق رسالة الإرسال"
            onClick={() => {
              setStatus("idle");
              setFeedback("");
            }}
          />
          <div className="luniva-mail-popup__card">
            <button
              type="button"
              autoFocus
              onClick={() => {
                setStatus("idle");
                setFeedback("");
              }}
              className="luniva-mail-popup__close"
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>

            <div className="luniva-mail is-revealed" aria-hidden="true">
              <div className="luniva-mail__mail">
                <div className="luniva-mail__back-fold" />
                <div className="luniva-mail__letter">
                  <div className="luniva-mail__letter-border" />
                  <div className="luniva-mail__letter-title" />
                  <div className="luniva-mail__letter-context" />
                  <div className="luniva-mail__stamp" />
                </div>
                <div className="luniva-mail__top-fold" />
                <div className="luniva-mail__body" />
                <div className="luniva-mail__left-fold" />
              </div>
              <div className="luniva-mail__shadow" />
            </div>

            <h3 id="contact-success-title" className="luniva-mail-popup__title">وصلت رسالتك!</h3>
            <p className="luniva-mail-popup__text">{feedback}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setFeedback("");
              }}
              className="btn btn-primary mt-5 w-full py-2.5 text-xs"
            >
              تمام، شكرًا لكِ
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
