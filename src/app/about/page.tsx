import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Gift,
  HeartHandshake,
  Layers3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import BrandGlassCard from "@/components/about/brand-glass-card";
import PublicSiteShell from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "من نحن | لونيفا",
  description: "لونيفا شركة ملابس نسائية مصرية تأسست عام 2026. تعرّفي على رؤيتنا وما نقدّمه من منتجات وبكدجات.",
};

const values = [
  {
    icon: Sparkles,
    title: "اختيار مدروس",
    text: "ننتقي القطع التي تصلح للاستخدام اليومي والمناسبات معًا، بأسلوب يعبّر عن شخصيتك دون تعقيد.",
  },
  {
    icon: Eye,
    title: "وضوح كامل",
    text: "الألوان والمقاسات والصور والأسعار النهائية ظاهرة قبل أي قرار، لتقارني وتختاري بثقة.",
  },
  {
    icon: Gift,
    title: "بكدجات مُنسّقة",
    text: "توليفات جاهزة تجمع أكثر من قطعة في سعر واحد مدروس، لتجدي ما يناسب ذوقك وميزانيتك.",
  },
  {
    icon: ShieldCheck,
    title: "تعامل بثقة",
    text: "معلومات دقيقة وتواصل واضح واهتمام بكل تفصيلة تخص تجربتك معنا من البداية للنهاية.",
  },
];

const steps = [
  {
    number: "١",
    title: "اكتشفي التشكيلة",
    text: "ابدئي من الكتالوج، وتصفّحي المنتجات والبكدجات كما هي بلا أي بيانات خاصة.",
  },
  {
    number: "٢",
    title: "قارني التفاصيل",
    text: "افتح صفحة القطعة لتري الألوان والمقاسات والسعر بعد الخصم وكل ما يهمك قبل الطلب.",
  },
  {
    number: "٣",
    title: "تابعي بسهولة",
    text: "مع فاتورتك تجدين رمزًا للمعاينة وحالة التوصيل، لتعرفي أين وصل طلبك في أي وقت.",
  },
];

export default function AboutPage() {
  return (
    <PublicSiteShell section="about">
      <section
        className="page-enter relative overflow-hidden rounded-[1.75rem] border px-5 py-10 sm:rounded-[2.25rem] sm:px-10 sm:py-14"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "var(--lav-soft)" }} />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "var(--brand-soft)" }} />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="min-w-0">
            <span className="badge badge-brand"><Sparkles size={13} />من نحن</span>
            <h1 className="page-title mt-5 text-[2.1rem] leading-[1.18] sm:text-[3rem]">
              لونيفا، أناقة مصرية
              <span className="mt-1 block" style={{ color: "var(--brand-strong)" }}>بتفاصيل مدروسة</span>
            </h1>
            <p className="page-subtitle mt-5 max-w-2xl text-sm leading-9 sm:text-base">
              نحن شركة ملابس نسائية مصرية تأسست عام 2026، ونؤمن أن الاختيار الجميل يبدأ من وضوح التفاصيل: قطع مُنتقاة، وألوان ومقاسات معلومة، وأسعار نهائية تساعدك على اتخاذ قرارك بثقة.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="badge badge-lav">تأسست عام 2026</span>
              <span className="badge badge-brand">شركة ملابس نسائية مصرية</span>
              <span className="badge badge-success">منتجات وبكدجات مختارة</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/" className="btn btn-primary px-4 py-2.5 text-[11px]">
                <ArrowLeft size={14} />تصفّح الكتالوج
              </Link>
              <Link href="/faq" className="btn btn-outline px-4 py-2.5 text-[11px]">
                الأسئلة الشائعة
              </Link>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {[
              { icon: MapPin, title: "جذور مصرية", text: "هوية محلية وذوق قريب منك." },
              { icon: Target, title: "هدف واضح", text: "تجربة اختيار بسيطة وصريحة." },
              { icon: HeartHandshake, title: "تعامل إنساني", text: "اهتمام حقيقي بكل تفصيلة." },
              { icon: Layers3, title: "تشكيلة متجددة", text: "منتجات وبكدجات في مكان واحد." },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  <Icon size={17} />
                </span>
                <p className="mt-3 text-[12px] font-black" style={{ color: "var(--ink)" }}>{title}</p>
                <p className="mt-1 text-[10px] leading-6 muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BrandGlassCard />

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="app-card min-w-0 p-5 sm:p-7">
          <p className="eyebrow">حكايتنا</p>
          <h2 className="section-title mt-2">بدأت من فكرة بسيطة</h2>
          <p className="mt-4 text-[12px] leading-8 muted">
            أن تكون تجربة اختيار الملابس قريبة منك، صريحة في عرضها، وخالية من التعقيد. من هذا الهدف جاءت لونيفا لتقدّم تشكيلة تُرى بوضوح، وتُقارن بسهولة، وتُختار عن اقتناع.
          </p>
          <p className="mt-3 text-[12px] leading-8 muted">
            ننظر إلى كل قطعة بوصفها جزءًا من أسلوب حياة، لا مجرد عنصر في كتالوج. لذلك نحرص على تنسيق المنتجات والبكدجات حول احتياجات يومية وميزانيات مختلفة، مع الحفاظ على الجودة والذوق.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { value: "٢٠٢٦", label: "سنة التأسيس" },
              { value: "١٠٠٪", label: "عرض واضح" },
              { value: "٢", label: "منتجات وبكدجات" },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <p className="mono text-base font-black" style={{ color: "var(--brand-strong)" }}>{value}</p>
                <p className="mt-1 text-[9px] font-bold muted-2">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card min-w-0 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
              <Eye size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="section-title">رؤيتنا</h2>
              <p className="mt-0.5 text-[11px] muted-2">ما نحرص على تقديمه في كل تفصيلة.</p>
            </div>
          </div>
          <blockquote className="mt-5 rounded-2xl p-5 text-[13px] font-bold leading-9" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
            «أن تكون لونيفا وجهةً سهلة وواضحة للمرأة المصرية، تجد فيها ما يناسبها من قطع مُختارة وبكدجات مُنسّقة، وتعرف كل التفاصيل قبل أن تقرر.»
          </blockquote>
          <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
            <span className="rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }}>وضوح في السعر</span>
            <span className="rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }}>احترام في التعامل</span>
            <span className="rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }}>اهتمام بالتفاصيل</span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">ما نؤمن به</p>
            <h2 className="section-title mt-2">قيم تصنع فرقًا</h2>
          </div>
          <p className="max-w-md text-[11px] leading-6 muted-2">
            أربع قواعد نعود إليها في كل قطعة نعرضها وكل خدمة نقدّمها.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, text }) => (
            <article key={title} className="app-card min-w-0 p-5 transition hover:-translate-y-1">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <Icon size={18} />
              </span>
              <h3 className="mt-4 text-[13px] font-black" style={{ color: "var(--ink)" }}>{title}</h3>
              <p className="mt-2 text-[11px] leading-7 muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="app-card mt-10 min-w-0 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="section-title">كيف تبدأ معنا؟</h2>
            <p className="mt-0.5 text-[11px] muted-2">ثلاث خطوات بسيطة من التصفح حتى المتابعة.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {steps.map(({ number, title, text }) => (
            <div key={number} className="rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <span className="grid h-9 w-9 place-items-center rounded-xl text-[13px] font-black" style={{ background: "var(--brand-strong)", color: "#fff" }}>{number}</span>
              <h3 className="mt-3 text-[12px] font-black" style={{ color: "var(--ink)" }}>{title}</h3>
              <p className="mt-1.5 text-[11px] leading-7 muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="page-enter mt-10 overflow-hidden rounded-[1.75rem] px-6 py-9 text-white sm:px-10 sm:py-12"
        style={{ background: "linear-gradient(135deg, var(--plum), var(--brand-strong))", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.14em] text-white/70">لونيفا</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">جاهزة لاكتشاف التشكيلة؟</h2>
            <p className="mt-2 max-w-lg text-sm leading-8 text-white/75">
              تصفّحي المنتجات والبكدجات كما هي، بأسعار واضحة وتفاصيل كاملة تساعدك على الاختيار.
            </p>
          </div>
          <Link href="/" className="btn shrink-0 bg-white text-[#7c4354] hover:bg-white/90">
            <ArrowLeft size={16} />تصفّح الكتالوج
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
