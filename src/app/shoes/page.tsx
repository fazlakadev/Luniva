import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Heart, Layers3, Sparkles } from "lucide-react";
import ShoeShowcase from "@/components/shoes/shoe-showcase";
import PublicSiteShell from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "سنيكر لونيفا | مجموعة الأحذية | لونيفا",
  description:
    "اكتشفي سنيكر لونيفا بثلاثة ألوان بلومي ووردي وكريمي، بمقاسات من 36 إلى 44. تفاصيل واضحة وسعر نهائي 1290 ج.م، وتواصل مباشر لطلبك.",
};

const details = [
  {
    icon: Sparkles,
    title: "راحة تدوم",
    text: "نعل مبطّن يخفف الضغط في المشي الطويل، مع ثبات خفيف يمنحك خطوة مريحة من الصباح حتى المساء.",
  },
  {
    icon: Layers3,
    title: "خامات مُختارة",
    text: "سطح علوي مسامي يسمح بمرور الهواء، ونعل خارجي متين يجمع بين المرونة والثبات على مختلف الأسطح.",
  },
  {
    icon: Heart,
    title: "عناية سهلة",
    text: "امسحي السنيكر بقطعة قماش ناعمة رطبة واتركيه يجف في الظل؛ تجنّبي الغسيل في الغسالة للحفاظ على شكله.",
  },
];

export default function ShoesPage() {
  return (
    <PublicSiteShell section="products">
      <ShoeShowcase />

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">تفاصيل تهمّك</p>
            <h2 className="section-title mt-2">صُمّم ليواكب يومك</h2>
          </div>
          <p className="max-w-md text-[11px] leading-6 muted-2">
            ثلاث نقاط بسيطة تعرفين بها ما تختارينه قبل إرسال طلبك إلينا.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(({ icon: Icon, title, text }) => (
            <article key={title} className="app-card min-w-0 p-5 transition hover:-translate-y-1 motion-reduce:transition-none">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <Icon size={18} />
              </span>
              <h3 className="mt-4 text-[13px] font-black" style={{ color: "var(--ink)" }}>
                {title}
              </h3>
              <p className="mt-2 text-[11px] leading-7 muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="page-enter mt-10 overflow-hidden rounded-[1.75rem] px-6 py-9 text-white sm:px-10 sm:py-12"
        style={{ background: "linear-gradient(135deg, var(--plum), var(--brand-strong))", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.14em] text-white/70">لونيفا · الأحذية</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">جاهزة تختاري لونك ومقاسك؟</h2>
            <p className="mt-2 max-w-lg text-sm leading-8 text-white/75">
              أرسلينا اختيارك وسنردّ عليك بتأكيد التوفر وخطوات الطلب، بلا أي خطوة دفع على الموقع.
            </p>
          </div>
          <Link href="/contact?product=sneaker" className="btn shrink-0 bg-white text-[#7c4354] hover:bg-white/90">
            <ArrowLeft size={16} />تواصل معنا
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
