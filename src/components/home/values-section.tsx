"use client";

import Link from "next/link";
import { ArrowUpLeft, Sparkles } from "lucide-react";
import ValueCard from "@/components/home/value-card";
import AmbientGlow from "@/components/motion/ambient-glow";
import { BlurFade } from "@/components/motion/blur-fade";

const QUICK_FACTS = [
  { value: "٤", label: "خطوات واضحة", tone: "var(--brand-strong)" },
  { value: "١٠٠٪", label: "أسعار نهائية", tone: "var(--lav-strong)" },
  { value: "٢٠٢٦", label: "تأسست لونيفا", tone: "var(--success)" },
];

export default function ValuesSection() {
  return (
    <section
      id="values"
      dir="rtl"
      className="relative mt-16 scroll-mt-28 overflow-hidden rounded-[2rem] border p-5 sm:p-8"
      style={{
        borderColor: "var(--line)",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--surface) 92%, transparent), color-mix(in srgb, var(--brand-soft) 62%, var(--surface)))",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <AmbientGlow
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
        style={{ background: "var(--brand-soft)" }}
        delay={0}
      />
      <AmbientGlow
        className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full"
        style={{ background: "var(--lav-soft)" }}
        delay={2.4}
      />

      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <BlurFade inView>
          <span className="badge badge-brand"><Sparkles size={13} />لماذا لونيفا</span>
          <h2 className="mt-3 max-w-xl text-xl font-black leading-relaxed tracking-tight sm:text-2xl" style={{ color: "var(--ink)" }}>
            تفاصيل صغيرة تصنع اختيارك بسهولة
          </h2>
          <p className="mt-3 max-w-xl text-xs leading-7 muted sm:text-sm">
            من الصورة واللون والمقاس إلى السعر بعد الخصم، كل ما تحتاجي معرفته ظاهر قبل أن تقرري.
            لا مفاجآت، ولا خطوات مخفية—فقط تفاصيل صادقة تساعدك على الاختيار بثقة.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/catalog/products" className="btn btn-primary px-4 py-2.5 text-[11px]">
              تصفّح المنتجات <ArrowUpLeft size={14} />
            </Link>
            <Link href="/catalog/packages" className="btn btn-soft px-4 py-2.5 text-[11px]">
              اكتشفي البكدجات <ArrowUpLeft size={14} />
            </Link>
          </div>
        </BlurFade>

        <BlurFade inView delay={0.08}>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {QUICK_FACTS.map((fact) => (
              <div
                key={fact.label}
                className="rounded-2xl border px-2 py-4 text-center sm:px-3 sm:py-5"
                style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 82%, transparent)" }}
              >
                <p className="money text-lg font-black sm:text-2xl" style={{ color: fact.tone }}>{fact.value}</p>
                <p className="mt-1 text-[9px] font-extrabold leading-4 muted sm:text-[10px]">{fact.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
            <p className="text-[10px] font-black">كل قطعة وكل بكدج يظهران بتفاصيل كاملة قبل الطلب</p>
          </div>
        </BlurFade>
      </div>

      <div className="relative mt-7 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: "var(--line)" }} />
        <span className="text-[10px] font-black" style={{ color: "var(--muted-2)" }}>ما الذي يميز تجربتك؟</span>
        <span className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BlurFade inView delay={0.04} className="min-w-0 h-full">
          <ValueCard
            icon="palette"
            tone="brand"
            title="ألوان ومقاسات واضحة"
            description="كل متغير له صورته ولونه ومقاسه، لتعرفي بالضبط ما تختاره قبل الطلب."
          />
        </BlurFade>
        <BlurFade inView delay={0.1} className="min-w-0 h-full">
          <ValueCard
            icon="ruler"
            tone="lav"
            title="مقارنة سهلة"
            description="قارني بين المنتجات والبكدجات في صفحة واحدة، واختاري ما يناسب ذوقك وميزانيتك."
          />
        </BlurFade>
        <BlurFade inView delay={0.16} className="min-w-0 h-full">
          <ValueCard
            icon="badge-percent"
            tone="success"
            title="أسعار بعد الخصم"
            description="السعر النهائي وقيمة الخصم ظاهرين بوضوح، من غير أي خطوات إضافية."
          />
        </BlurFade>
        <BlurFade inView delay={0.22} className="min-w-0 h-full">
          <ValueCard
            icon="shield-check"
            tone="warning"
            title="تجربة بثقة"
            description="تفاصيل كاملة وشركة مصرية تأسست عام 2026، وتصميم يحترم وقتك وذوقك."
          />
        </BlurFade>
      </div>
    </section>
  );
}
