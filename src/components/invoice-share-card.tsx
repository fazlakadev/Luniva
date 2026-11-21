"use client";

import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Link2, MessageSquare, QrCode, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";

export default function InvoiceShareCard({
  id,
  invoiceNumber,
  initialUrl,
  initialQr,
  customerName,
  customerPhone,
  total,
  remaining,
}: {
  id: string;
  invoiceNumber: string;
  initialUrl: string;
  initialQr: string;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number;
  remaining?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [url, setUrl] = useState(initialUrl);
  const [qr, setQr] = useState(initialQr);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("تم نسخ الرابط", "أرسليه للعميلة ليشاهد فاتورتها مباشرة.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر نسخ الرابط", "انسخي الرابط من الحقل يدويًا.");
    }
  }

  async function rotate() {
    if (busy) return;
    if (!window.confirm("تجديد الرابط سيوقف عمل الرابط القادم حاليًا. هل تريدين المتابعة؟")) return;
    setBusy(true);
    const toastId = toast.loading("جارِ تجديد الرابط", "بنولّد معرّفًا جديدًا للفاتورة…");
    try {
      const response = await fetch(`/api/invoices/${id}/view-token`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تجديد الرابط.");
      setUrl(String(data.url));
      setQr(String(data.qr));
      toast.update(toastId, { tone: "success", title: "تم تجديد الرابط", description: "الرابط القديم لم يعد صالحًا." });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تجديد الرابط.";
      toast.update(toastId, { tone: "error", title: "لم يتم التجديد", description: message });
    } finally {
      setBusy(false);
    }
  }

  async function sendViaWhatsApp() {
    if (sendingWhatsApp) return;
    setSendingWhatsApp(true);

    const targetName = customerName || "عميلتنا العزيزة";
    const totalText = total !== undefined ? `${total} ج.م` : "";
    const remainingText = remaining !== undefined && remaining > 0 ? `المتبقي: ${remaining} ج.م` : "خالصة السداد بالكامل ✓";

    const messageText = `مرحباً بكِ أستاذة ${targetName} ✨\nيسعدنا تسوقكِ من لونيفا فاشون.\nتم إصدار فاتورتك رقم ${invoiceNumber}.\n${totalText ? `الإجمالي: ${totalText}\n` : ""}${remainingText}\n\nيمكنكِ معاينة تفاصيل الفاتورة وحالة الطلب عبر هذا الرابط الآمن:\n${url}\n\nشكراً لاختياركِ Luniva! 🌸`;

    try {
      if (customerPhone) {
        // Record in backend log
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: targetName,
            phone: customerPhone,
            templateCategory: "invoice",
            message: messageText,
            sentBy: "المسؤول",
          }),
        }).catch(() => null);

        let digits = customerPhone.replace(/[^\d]/g, "");
        if (digits.startsWith("01") && digits.length === 11) digits = "2" + digits;
        if (digits.startsWith("00")) digits = digits.slice(2);

        const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("تم تجهيز رسالة الواتساب", "تم فتح واتساب وجارِ إرسال الفاتورة للعميلة.");
    } finally {
      setSendingWhatsApp(false);
    }
  }

  return (
    <section className="app-card p-5 print-hidden">
      <div className="flex items-center gap-2">
        <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><QrCode size={19} /></span>
        <div>
          <h2 className="section-title">مشاركة الفاتورة</h2>
          <p className="text-[10px] muted-2">رابط آمن للعميلة بدون دخول للنظام.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl p-3" style={{ background: "var(--brand-soft)", border: "1px solid var(--line)" }}>
            <span className="grid h-40 w-40 place-items-center rounded-xl bg-white p-1.5" style={{ border: "1px solid var(--line)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="رمز معاينة الفاتورة" className="h-full w-full rounded-lg" />
            </span>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-black" style={{ color: "var(--brand-strong)" }}>امسحي رمز الاستجابة السريعة</p>
            <p className="mt-1 text-[10px] font-bold leading-5 muted">
              يفتح معاينة الفاتورة والمنتجات وحالة التوصيل على الهاتف.
            </p>
            <p className="mono mt-1.5 text-[9px]" dir="ltr" style={{ color: "var(--muted-2)" }}>{invoiceNumber}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold" style={{ color: "var(--muted)" }}>
          <Link2 size={11} />رابط المعاينة
        </p>
        <p dir="ltr" className="mono break-all text-left text-[10px] leading-4" style={{ color: "var(--brand-strong)" }}>{url}</p>
      </div>

      {/* WhatsApp 1-Click Action */}
      <button
        type="button"
        onClick={sendViaWhatsApp}
        disabled={sendingWhatsApp}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-black text-white bg-[#25D366] hover:bg-[#20ba59] shadow-sm transition-all"
      >
        <Send size={14} />
        {customerPhone ? `إرسال الفاتورة عبر واتساب (${customerPhone})` : "مشاركة الفاتورة عبر واتساب"}
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn btn-primary px-2 py-2 text-[10px]">
          {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "تم النسخ" : "نسخ الرابط"}
        </button>
        <button type="button" onClick={rotate} disabled={busy} className="btn btn-outline px-2 py-2 text-[10px]">
          {busy ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}تجديد الرابط
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        <p className="text-[10px] font-bold leading-5">
          الرابط موقّع ومشفر، يفتح صفحة عرض فقط للعميلة. لا يحتوي على تسجيل دخول ولا يسمح بالوصول إلى أي بيانات أخرى.
        </p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
        <ExternalLink size={11} />معاينة الرابط
      </a>
    </section>
  );
}
