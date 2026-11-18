"use client";

import { Check, Copy, ExternalLink, Link2, QrCode, Share2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";

export default function CatalogShareCard({
  url,
  qr,
  name,
  kindLabel,
  layout = "panel",
}: {
  url: string;
  qr: string;
  name: string;
  kindLabel: string;
  layout?: "panel" | "inline";
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const inline = layout === "inline";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("تم نسخ الرابط", "أرسليه للعميلة لفتح صفحة التفاصيل مباشرة.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذّر نسخ الرابط", "انسخي الرابط من الحقل يدويًا.");
    }
  }

  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({
        title: `${name} | لونيفا`,
        text: `تفاصيل ${kindLabel} في لونيفا`,
        url,
      });
      toast.success("تمت المشاركة", "اختاري التطبيق الذي تريدين إرسال الرابط إليه.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className={`app-card print-hidden ${inline ? "p-4 sm:p-5" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <QrCode size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">مشاركة {kindLabel}</h2>
          <p className="mt-0.5 text-[10px] font-bold leading-4 muted-2">
            رمز ورابط يفتحان صفحة التفاصيل في الموقع العام.
          </p>
        </div>
      </div>

      <div
        className={`mt-4 ${
          inline
            ? "grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center"
            : "rounded-2xl p-4"
        }`}
        style={inline ? undefined : { background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex justify-center">
          <span
            className={`grid place-items-center rounded-2xl ${inline ? "h-28 w-28 p-2" : "h-40 w-40 p-3"}`}
            style={{ background: "var(--brand-soft)", border: "1px solid var(--line)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`رمز الاستجابة السريعة لصفحة ${name}`}
              className="h-full w-full rounded-xl bg-white p-1"
            />
          </span>
        </div>

        <div className="min-w-0">
          <p className={`font-black ${inline ? "text-xs sm:text-sm" : "text-center text-xs"}`} style={{ color: "var(--brand-strong)" }}>
            امسحي الرمز أو افتحي الرابط
          </p>
          <p className={`mt-1 font-bold leading-5 muted ${inline ? "text-[10px]" : "text-center text-[10px]"}`}>
            ستنتقل العميلة مباشرة إلى صفحة تفاصيل <b style={{ color: "var(--ink)" }}>{name}</b> في الموقع العام،
            بدون تسجيل دخول.
          </p>
          <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold" style={{ color: "var(--muted)" }}>
              <Link2 size={11} />رابط صفحة التفاصيل
            </p>
            <p dir="ltr" className="mono break-all text-left text-[10px] leading-4" style={{ color: "var(--brand-strong)" }}>
              {url}
            </p>
          </div>
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${inline ? "sm:grid-cols-3" : "grid-cols-2"}`}>
        <button type="button" onClick={copy} className="btn btn-primary px-2 py-2 text-[10px]">
          {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "تم النسخ" : "نسخ الرابط"}
        </button>
        <button type="button" onClick={share} disabled={sharing} className="btn btn-soft px-2 py-2 text-[10px]">
          <Share2 size={13} />{sharing ? "جارِ المشاركة…" : "مشاركة الرابط"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn-outline px-2 py-2 text-[10px] ${inline ? "" : "col-span-2"}`}
        >
          <ExternalLink size={13} />معاينة الصفحة
        </a>
      </div>
    </section>
  );
}
