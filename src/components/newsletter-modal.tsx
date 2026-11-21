"use client";

import { useState } from "react";
import { Check, Copy, Gift, Mail, Sparkles, X } from "lucide-react";
import { useToast } from "@/components/toast";

interface NewsletterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewsletterModal({ open, onClose }: NewsletterModalProps) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      toast.error("بريد غير صالح", "يرجى كتابة بريد إلكتروني صحيح.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, source: "navbar" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر الاشتراك");

      setSuccess(true);
      toast.success("تم الاشتراك بنجاح!", "أهلاً بكِ في نادي لونيفا ✨");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر الاشتراك حالياً";
      toast.error("خطأ", msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText("LUNIVA10");
    setCopied(true);
    toast.success("تم نسخ الكود", "استخدمي كود LUNIVA10 للحصول على خصم 10% عند طلبكِ!");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl"
        style={{ background: "var(--surface)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] transition"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        {!success ? (
          <div>
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-inner">
                <Gift size={28} />
              </span>
              <span className="badge badge-lav mt-3 text-[10px] font-bold">
                <Sparkles size={11} /> نادي عميلات لونيفا
              </span>
              <h2 className="mt-2 text-xl font-black text-[var(--ink)] sm:text-2xl">
                اشتركي في النشرة البريدية
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                كوني أول من يطّلع على تصاميم الكولكشن الجديد، عروض البكدجات التوفيرية، وتخفيضات نهاية الموسم الحصرية.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="mt-6 space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="field pr-10 text-right text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full justify-center py-3 text-xs font-black shadow-md disabled:opacity-50"
              >
                {submitting ? "جارِ الاشتراك..." : "انضمي الآن واحصلي على كود خصم"}
              </button>
            </form>
          </div>
        ) : (
          <div className="py-4 text-center space-y-4">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Check size={32} />
            </span>
            <h2 className="text-xl font-black text-[var(--ink)]">
              أهلاً بكِ في عائلة لونيفا ✨
            </h2>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              تم تسجيل بريدكِ بنجاح. هديتكِ الترحيبية هي كود خصم 10% على طلبكِ القادم:
            </p>

            <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-[var(--brand)] bg-[var(--brand-soft)] p-3">
              <span className="font-mono text-base font-black text-[var(--brand-strong)] tracking-wider">
                LUNIVA10
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn btn-primary text-xs px-3 py-1.5"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "تم النسخ" : "نسخ الكود"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary w-full justify-center text-xs mt-2"
            >
              متابعة تصفح المتجر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
