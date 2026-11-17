import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gift, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "من نحن | لونيفا",
  description: "لونيفا شركة ملابس نسائية مصرية تأسست عام 2026. تعرّفي على رؤيتنا وما نقدّمه من منتجات وبكدجات.",
};

const pillars = [
  {
    icon: Sparkles,
    title: "اختيار مدروس",
    text: "ننتقي القطع التي تصلح للاستخدام اليومي والمناسبات معًا، بأسلوب يعبر عن شخصيتك.",
  },
  {
    icon: Layers3,
    title: "تفاصيل واضحة",
    text: "نعرض الألوان والمقاسات والأسعار النهائية لتختاري بثقة ودون تردد.",
  },
  {
    icon: Gift,
    title: "بكدجات مُنسّقة",
    text: "توليفات جاهزة تجمع أكثر من قطعة في سعر واحد مدروس ومناسب.",
  },
  {
    icon: ShieldCheck,
    title: "تعامل بثقة",
    text: "معلومات دقيقة وتواصل واضح واهتمام بكل تفصيلة تخص تجربتك معنا.",
  },
];

export default function AboutPage() {
  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-x-clip"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 8% 0%, var(--brand-soft) 0, transparent 34%), radial-gradient(circle at 94% 16%, var(--lav-soft) 0, transparent 30%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand) 22%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at top, black, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black, transparent 72%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-3 pb-12 sm:px-6">
        <header className="flex items-center justify-between gap-3 py-5 sm:py-7">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm"
              style={{ border: "1px solid var(--line)" }}
            >
              <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} priority className="h-10 w-10 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black tracking-tight" style={{ color: "var(--ink)" }}>لونيفا</span>
              <span className="block truncate text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>شركة ملابس نسائية مصرية</span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2">
            <Link href="/" className="btn btn-outline px-3 py-2 text-[11px]">
              <ArrowLeft size={14} />الكتالوج
            </Link>
            <ThemeToggle showLabel={false} />
          </nav>
        </header>

        <section
          className="page-enter relative overflow-hidden rounded-[1.75rem] border px-6 py-12 sm:rounded-[2.25rem] sm:px-10 sm:py-16"
          style={{
            borderColor: "var(--line)",
            background: "color-mix(in srgb, var(--surface) 88%, transparent)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: "var(--lav-soft)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: "var(--brand-soft)" }}
          />
          <div className="relative max-w-3xl">
            <span className="badge badge-brand"><Sparkles size={13} />من نحن</span>
            <h1 className="page-title mt-5 text-[2.1rem] leading-[1.2] sm:text-[3rem]">
              لونيفا، أناقة مصرية بتفاصيل مدروسة
            </h1>
            <p className="page-subtitle mt-5 text-sm leading-10 sm:text-base">
              نحن شركة ملابس نسائية مصرية تأسست عام 2026، ونؤمن أن الاختيار الجميل يبدأ من وضوح التفاصيل: قطع مُنتقاة، وألوان ومقاسات معلومة، وأسعار نهائية تساعدك على اتخاذ قرارك بثقة.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="badge badge-lav">تأسست عام 2026</span>
              <span className="badge badge-brand">شركة ملابس نسائية مصرية</span>
              <span className="badge badge-success">منتجات وبكدجات مختارة</span>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="app-card p-7 sm:p-9">
            <p className="eyebrow">حكايتنا</p>
            <h2 className="section-title mt-2">بدأت من فكرة بسيطة</h2>
            <p className="mt-4 text-sm leading-9 muted">
              أن تكون تجربة اختيار الملابس قريبة منك، صريحة في عرضها، وخالية من التعقيد. من هذا الهدف جاءت لونيفا لتقدّم تشكيلة تُرى بوضوح، وتُقارن بسهولة، وتُختار عن اقتناع.
            </p>
            <p className="mt-4 text-sm leading-9 muted">
              ننظر إلى كل قطعة بوصفها جزءًا من أسلوب حياة، لا مجرد عنصر في كتالوج. لذلك نحرص على تنسيق المنتجات والبكدجات حول احتياجات يومية وميزانيات مختلفة، مع الحفاظ على الجودة والذوق.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="app-card p-5 transition hover:-translate-y-1"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-2xl"
                  style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                >
                  <Icon size={19} />
                </span>
                <h3 className="mt-4 text-sm font-extrabold" style={{ color: "var(--ink)" }}>{title}</h3>
                <p className="mt-2 text-xs leading-7 muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="page-enter mt-12 overflow-hidden rounded-[1.75rem] px-6 py-9 text-white sm:px-10 sm:py-12"
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

        <footer
          className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-center text-[11px] sm:flex-row sm:text-right"
          style={{ borderColor: "var(--line)", color: "var(--muted-2)" }}
        >
          <span>© {new Date().getFullYear()} لونيفا · شركة ملابس نسائية مصرية · جميع الحقوق محفوظة</span>
          <Link href="/" className="font-bold" style={{ color: "var(--brand-strong)" }}>العودة إلى الكتالوج</Link>
        </footer>
      </div>
    </main>
  );
}
