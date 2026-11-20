import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Eye,
  Gift,
  Heart,
  HeartHandshake,
  Layers3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import AboutTunnel from "@/components/about/about-tunnel";
import BrandGlassCard from "@/components/about/brand-glass-card";
import PublicSiteShell from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "من نحن | لونيفا LUNIVA",
  description:
    "لونيفا شركة أزياء نسائية مصرية تأسست عام 2026. نبتكر تصاميم راقية بتفاصيل مدروسة وأسعار واضحة وتجربة تسوق شفافة.",
};

const values = [
  {
    icon: Sparkles,
    title: "اختيار مدروس",
    text: "ننتقي القطع التي تصلح للاستخدام اليومي والمناسبات معًا، بأسلوب يعبّر عن أناقتك وراحتك دون تعقيد.",
    color: "var(--brand-strong)",
    bg: "var(--brand-soft)",
  },
  {
    icon: Eye,
    title: "وضوح وشفافية كاملة",
    text: "الألوان والمقاسات والصور الواقعية والأسعار النهائية واضحة قبل أي قرار، لتقارني وتختاري بثقة تامة.",
    color: "var(--lav-strong)",
    bg: "var(--lav-soft)",
  },
  {
    icon: Gift,
    title: "بكدجات متكاملة",
    text: "توليفات أنيقة تجمع أكثر من قطعة منسقة بسعر واحد مدروس، لتجدي ما يناسب ذوقك وميزانيتك.",
    color: "#db2777",
    bg: "rgba(219, 39, 119, 0.12)",
  },
  {
    icon: ShieldCheck,
    title: "ثقة وضمان مستمر",
    text: "معلومات دقيقة وتواصل ودود ومتابعة لكل تفصيلة تخص تجربتك وطلبك من البداية وحتى الاستلام.",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.12)",
  },
];

const milestones = [
  {
    year: "٢٠٢٦",
    title: "انطلاق العلامة",
    desc: "تأسست لونيفا في مصر برؤية واضحة لتقديم أزياء نسائية تمزج الأصالة بالعصرية والراحة.",
  },
  {
    year: "الجودة",
    title: "اختيار الخامات والقصّات",
    desc: "اعتماد أقمشة عالية التحمل مع تشطيب دقيق ومقاسات مريحة تناسب المرأة العربية.",
  },
  {
    year: "الشفافية",
    title: "تجربة طلب بلا غموض",
    desc: "أسعار نهائية، سياسات واضحة، وإمكانية تتبع مراحل التوصيل خطوة بخطوة.",
  },
];

const steps = [
  {
    number: "١",
    title: "اكتشفي التشكيلة",
    text: "ابدئي من الكتالوج العام، وتصفّحي الموديلات والقطع الفردية أو البكدجات المتناسقة بكل حرية.",
  },
  {
    number: "٢",
    title: "قارني وتأكدي من المقاس",
    text: "اطّلعي على تفاصيل كل قطعة: جدول المقاسات، درجات الألوان المتاحة، وسعر القطعة الشفاف.",
  },
  {
    number: "٣",
    title: "تواصلي وتابعي خطوة بخطوة",
    text: "أتمي طلبك عبر الواتساب أو الفاتورة الرقمية مع متابعة لحظية لحالة التجهيز والتوصيل.",
  },
];

export default function AboutPage() {
  return (
    <PublicSiteShell section="about">
      {/* Fullscreen Interactive 3D Tunnel Hero with Scroll Parallax */}
      <section className="relative w-full h-[100svh] min-h-screen overflow-hidden">
        <AboutTunnel />
      </section>

      {/* Main Page Content - Contained & Spaced */}
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
        {/* Brand Mission & Identity Section */}
        <section
          className="relative overflow-hidden rounded-[2rem] border px-6 py-10 shadow-lg sm:rounded-[2.5rem] sm:px-12 sm:py-16"
          style={{
            borderColor: "color-mix(in srgb, var(--brand) 25%, var(--line))",
            background: "color-mix(in srgb, var(--surface) 92%, transparent)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div
            className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full opacity-50 blur-3xl"
            style={{ background: "var(--lav-soft)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full opacity-45 blur-3xl"
            style={{ background: "var(--brand-soft)" }}
          />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="min-w-0">
              <span className="badge badge-brand mb-3.5 inline-flex items-center gap-1.5 py-1 px-3 text-xs">
                <Sparkles size={13} />من نحن
              </span>
              <h1 className="page-title text-[2.2rem] font-black leading-[1.2] sm:text-[3.2rem]">
                لونيفا.. أناقة مصرية
                <span className="mt-1.5 block bg-gradient-to-l from-[var(--brand-strong)] via-purple-600 to-[var(--plum)] bg-clip-text text-transparent">
                  بتفاصيل مدروسة وشفافية تامة
                </span>
              </h1>
              <p className="page-subtitle mt-5 max-w-2xl text-sm leading-8 sm:text-base sm:leading-9">
                نحن شركة ملابس نسائية مصرية تأسست عام 2026. انطلقنا من شغف حقيقي بإعادة صياغة تجربة تسوق الأزياء: قطع مُنتقاة بعناية، أقمشة مريحة، وأسعار نهائية شفافة تمكّنك من اتخاذ قرارك بأريحية واطمئنان.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="badge badge-lav text-xs font-bold py-1 px-3">
                  <Crown size={12} className="inline ml-1" /> تأسست عام 2026
                </span>
                <span className="badge badge-brand text-xs font-bold py-1 px-3">
                  صناعة وأناقة مصرية 🇪🇬
                </span>
                <span className="badge badge-success text-xs font-bold py-1 px-3">
                  تشكيلة وبكدجات متجددة
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/catalog/products"
                  className="btn btn-primary px-5 py-3 text-xs font-black shadow-md hover:-translate-y-0.5 active:scale-95 transition"
                >
                  <ArrowLeft size={15} />تصفّح تشكيلة المنتجات
                </Link>
                <Link
                  href="/contact"
                  className="btn btn-outline px-5 py-3 text-xs font-black active:scale-95 transition"
                >
                  تواصل معنا
                </Link>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {[
                { icon: MapPin, title: "جذور وهوية مصرية", text: "تصاميم تعكس الذوق الرفيع وتلائم نمط حياتك اليومي." },
                { icon: Target, title: "وضوح وصراحة", text: "كل التفاصيل والأسعار والمقاسات مُعلنة بلا مفاجآت." },
                { icon: HeartHandshake, title: "خدمة عملاء قريبة", text: "فريق جاهز للمساعدة في اختيار المقاس المناسب." },
                { icon: Layers3, title: "عروض وبكدجات", text: "تنسيقات ذكية توفر عليك الوقت والجهد والتكلفة." },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="group rounded-2xl border p-4.5 transition hover:-translate-y-1 hover:shadow-md"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--line)",
                  }}
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl transition-transform group-hover:scale-110"
                    style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                  >
                    <Icon size={18} />
                  </span>
                  <p className="mt-3.5 text-xs font-black" style={{ color: "var(--ink)" }}>{title}</p>
                  <p className="mt-1 text-[11px] leading-6 muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3D Glassmorphic Brand Showcase Card */}
        <div className="mt-12">
          <BrandGlassCard />
        </div>

        {/* Brand Narrative & Values */}
        <section className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-card min-w-0 p-6 sm:p-8">
            <p className="eyebrow">حكايتنا وتوجهنا</p>
            <h2 className="section-title mt-2 text-xl sm:text-2xl font-black">بدأت الفكرة من احترام وقتك وذوقك</h2>
            <p className="mt-4 text-[12.5px] leading-8 muted">
              أن تكون تجربة اختيار الملابس قريبة منك، صريحة في تفاصيلها، وخالية من الحيرة والتعقيد. من هذا المنطلق، ولدت لونيفا لتقدّم تشكيلة تُرى بوضوح، وتُقارن بسهولة، وتُختار عن اقتناع واطمئنان.
            </p>
            <p className="mt-3 text-[12.5px] leading-8 muted">
              نرى كل قطعة كجزء من يومك ومناسباتك، وليست مجرد رقم في كتالوج. لذلك نعمل على انتقاء الأقمشة التي تدوم وتمنحك الراحة والحرية، وتنسيق الألوان بتوازن يناسب كل إطلالة.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: "٢٠٢٦", label: "سنة التأسيس" },
                { value: "١٠٠٪", label: "شفافية في العرض" },
                { value: "دعم دائم", label: "خدمة ما بعد البيع" },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl p-3.5 text-center border shadow-xs"
                  style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}
                >
                  <p className="mono text-base sm:text-lg font-black" style={{ color: "var(--brand-strong)" }}>
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] font-bold muted-2">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card min-w-0 flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                  <Eye size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="section-title text-lg font-black">رؤيتنا ورسالتنا</h2>
                  <p className="mt-0.5 text-[11px] muted-2">المعايير التي تلهمنا في كل تصميم.</p>
                </div>
              </div>

              <blockquote
                className="mt-5 rounded-2xl border p-5 text-[13px] font-bold leading-9 shadow-sm"
                style={{
                  background: "var(--brand-soft)",
                  borderColor: "color-mix(in srgb, var(--brand) 30%, transparent)",
                  color: "var(--brand-strong)",
                }}
              >
                «أن تكون لونيفا الوجهة الأولى للمرأة التي تبحث عن أزياء متناسقة وعملية، تجمع بين الاحتشام والأناقة والراحة، مع تجربة شراء صريحة بلا مفاجآت.»
              </blockquote>
            </div>

            <div className="mt-6 space-y-2.5">
              {[
                "دقة متناهية في مواصفات الأقمشة والمقاسات",
                "أسعار نهائية مدروسة بدون رسوم خفية",
                "خدمة عملاء متابعة حتى وصول طلبك ليديك",
              ].map((point) => (
                <div key={point} className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--ink)" }}>
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Milestone Timeline */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">رحلة العلامة</p>
              <h2 className="section-title mt-1.5 text-xl sm:text-2xl font-black">محطات وثوابت لونيفا</h2>
            </div>
            <p className="max-w-md text-xs leading-6 muted-2">
              نلتزم بخطوات واثقة لتطوير كل ما يخص تجربة عملائنا في مصر.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {milestones.map(({ year, title, desc }) => (
              <div
                key={title}
                className="app-card relative overflow-hidden p-5 transition hover:-translate-y-1"
              >
                <span
                  className="inline-block rounded-xl px-2.5 py-1 text-[11px] font-black"
                  style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                >
                  {year}
                </span>
                <h3 className="mt-3 text-sm font-black" style={{ color: "var(--ink)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-6 muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Values Grid */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">قيمنا الراسخة</p>
              <h2 className="section-title mt-1.5 text-xl sm:text-2xl font-black">قيم تصنع الفارق في كل تفصيلة</h2>
            </div>
            <p className="max-w-md text-xs leading-6 muted-2">
              أربع ركائز أساسية نبني عليها كل قطعة نعرضها وكل معاملة نقوم بها.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, text, color, bg }) => (
              <article
                key={title}
                className="app-card group min-w-0 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl shadow-xs transition-transform group-hover:scale-110"
                  style={{ background: bg, color }}
                >
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-sm font-black" style={{ color: "var(--ink)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-7 muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="app-card mt-12 min-w-0 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
              <ShieldCheck size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="section-title text-xl font-black">كيف تبدأين معنا؟</h2>
              <p className="mt-0.5 text-xs muted-2">ثلاث خطوات بسيطة ومباشرة من الاستكشاف وحتى الاستلام.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map(({ number, title, text }) => (
              <div
                key={number}
                className="rounded-2xl border p-5 shadow-xs"
                style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, var(--brand-strong), var(--plum))" }}
                >
                  {number}
                </span>
                <h3 className="mt-3.5 text-xs sm:text-sm font-black" style={{ color: "var(--ink)" }}>
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-7 muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Luxury CTA Banner */}
        <section
          className="page-enter relative mt-12 overflow-hidden rounded-[2rem] border px-6 py-10 text-white sm:px-12 sm:py-14 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, var(--plum) 0%, #3e122b 50%, var(--brand-strong) 100%)",
            borderColor: "rgba(255, 255, 255, 0.15)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-35 blur-3xl bg-pink-400"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full opacity-30 blur-3xl bg-purple-500"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black text-white/90">
                <Star size={12} className="text-amber-300 fill-amber-300" /> لونيفا · أناقتك أولوية
              </span>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">جاهزة لاكتشاف التشكيلة الجديدة؟</h2>
              <p className="mt-2 text-xs sm:text-sm leading-7 text-white/80">
                تصفّحي المنتجات والبكدجات بأسعار نهائية وتفاصيل واضحة تساعدك على اختيار الأنسب لك بكل راحة.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link
                href="/catalog/products"
                className="btn inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-[#5a1c3b] shadow-xl transition hover:-translate-y-0.5 active:scale-95"
              >
                <ArrowLeft size={16} />تصفّح المنتجات الآن
              </Link>
              <Link
                href="/contact"
                className="btn inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-black text-white transition hover:bg-white/20 active:scale-95"
              >
                تواصلي معنا
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicSiteShell>
  );
}
