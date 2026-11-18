import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AmbientGlow from "@/components/motion/ambient-glow";
import { BlurFade } from "@/components/motion/blur-fade";
import MagneticLink from "@/components/motion/magnetic-link";
import PublicSiteShell from "@/components/public-site-shell";
import type { PublicSection } from "@/lib/public-sections";

type InfoBlock = {
  icon: typeof ShieldCheck;
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type FaqItem = {
  question: string;
  answer: string;
};

export default function PublicInfoPage({
  section,
  eyebrow,
  title,
  intro,
  badges,
  blocks,
  faqs = [],
  noteTitle,
  noteText,
  ctaTitle = "جاهزة لاكتشاف التشكيلة؟",
  ctaText = "تصفّحي المنتجات والبكدجات بأسعار واضحة وتفاصيل كاملة تساعدك على الاختيار.",
}: {
  section: PublicSection;
  eyebrow: string;
  title: string;
  intro: string;
  badges: string[];
  blocks: InfoBlock[];
  faqs?: FaqItem[];
  noteTitle?: string;
  noteText?: string;
  ctaTitle?: string;
  ctaText?: string;
}) {
  return (
    <PublicSiteShell section={section}>
      <section
        className="relative overflow-hidden rounded-[1.75rem] border px-5 py-10 sm:rounded-[2.25rem] sm:px-10 sm:py-14"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <AmbientGlow
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
          style={{ background: "var(--lav-soft)" }}
          delay={0}
        />
        <AmbientGlow
          className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full"
          style={{ background: "var(--brand-soft)" }}
          delay={2.5}
        />
        <BlurFade className="relative max-w-3xl">
          <span className="badge badge-brand"><Sparkles size={13} />{eyebrow}</span>
          <h1 className="page-title mt-5 text-[2.1rem] leading-[1.2] sm:text-[3rem]">{title}</h1>
          <p className="page-subtitle mt-5 text-sm leading-9 sm:text-base">{intro}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="badge badge-muted">{badge}</span>
            ))}
          </div>
        </BlurFade>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {blocks.map(({ icon: Icon, title: blockTitle, paragraphs = [], items = [] }, index) => (
          <BlurFade key={blockTitle} inView delay={Math.min(index, 6) * 0.06} className="min-w-0">
            <article className="app-card h-full min-w-0 p-5 sm:p-6">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <Icon size={19} />
              </span>
              <h2 className="section-title mt-4">{blockTitle}</h2>
              {paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[12px] leading-8 muted">{paragraph}</p>
              ))}
              {items.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12px] leading-7" style={{ color: "var(--muted)" }}>
                      <CheckCircle2 size={14} className="mt-1 shrink-0" style={{ color: "var(--success)" }} />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </BlurFade>
        ))}
      </section>

      {faqs.length > 0 && (
        <BlurFade inView className="mt-6">
          <section className="app-card p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                <FileText size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="section-title">إجابات سريعة</h2>
                <p className="mt-0.5 text-[11px] muted-2">اضغطي على السؤال لتظهر الإجابة.</p>
              </div>
            </div>
            <div className="space-y-3">
              {faqs.map(({ question, answer }) => (
                <details
                  key={question}
                  className="group rounded-2xl px-4 py-3.5 transition"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-black" style={{ color: "var(--ink)" }}>
                    <span className="min-w-0">{question}</span>
                    <ChevronDown size={15} className="shrink-0 transition group-open:rotate-180" style={{ color: "var(--brand-strong)" }} />
                  </summary>
                  <p className="mt-3 border-t pt-3 text-[12px] leading-8 muted" style={{ borderColor: "var(--line)" }}>{answer}</p>
                </details>
              ))}
            </div>
          </section>
        </BlurFade>
      )}

      {(noteTitle || noteText) && (
        <BlurFade inView className="mt-6">
          <aside
            className="flex items-start gap-3 rounded-2xl p-5"
            style={{ background: "var(--success-soft)", border: "1px solid color-mix(in srgb, var(--success) 24%, transparent)" }}
          >
            <ShieldCheck size={19} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
            <div className="min-w-0">
              {noteTitle && <p className="text-[12px] font-black" style={{ color: "var(--success)" }}>{noteTitle}</p>}
              {noteText && <p className="mt-1 text-[11px] leading-7" style={{ color: "var(--muted)" }}>{noteText}</p>}
            </div>
          </aside>
        </BlurFade>
      )}

      <BlurFade inView className="mt-10">
        <section
          className="overflow-hidden rounded-[1.75rem] px-6 py-9 text-white sm:px-10 sm:py-12"
          style={{ background: "linear-gradient(135deg, var(--plum), var(--brand-strong))", boxShadow: "var(--shadow-md)" }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.14em] text-white/70">لونيفا</p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{ctaTitle}</h2>
              <p className="mt-2 max-w-lg text-sm leading-8 text-white/75">{ctaText}</p>
            </div>
            <div className="flex flex-wrap shrink-0 gap-2">
              <MagneticLink href="/" className="btn bg-white text-[#7c4354] hover:bg-white/90">
                <ArrowLeft size={16} />تصفّح الكتالوج
              </MagneticLink>
              <MagneticLink href="/faq" className="btn border-white/40 text-white hover:bg-white/10">
                الأسئلة الشائعة
              </MagneticLink>
            </div>
          </div>
        </section>
      </BlurFade>
    </PublicSiteShell>
  );
}
