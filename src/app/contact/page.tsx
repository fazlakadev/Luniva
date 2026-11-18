import type { Metadata } from "next";
import {
  ArrowLeft,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import ContactForm from "@/components/contact-form";
import PublicSiteShell from "@/components/public-site-shell";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تواصل معنا | لونيفا",
  description: "تواصلي مع فريق لونيفا للاستفسار عن المنتجات والبكدجات أو الفواتير والتوصيل، عبر نموذج التواصل أو البريد المباشر.",
};

export default async function ContactPage() {
  const settings = await getSettings();
  const contactEmail = process.env.RECEIVER_EMAIL || process.env.EMAIL_USER || "";

  return (
    <PublicSiteShell section="contact">
      <section
        className="page-enter relative overflow-hidden rounded-[1.75rem] border px-5 py-10 sm:rounded-[2.25rem] sm:px-10 sm:py-14"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "var(--lav-soft)" }} />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "var(--brand-soft)" }} />
        <div className="relative grid gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <span className="badge badge-brand"><Sparkles size={13} />تواصل معنا</span>
            <h1 className="page-title mt-5 text-[2.1rem] leading-[1.2] sm:text-[3rem]">
              تحتاج مساعدة؟
              <span className="mt-1 block" style={{ color: "var(--brand-strong)" }}>نحن هنا لخدمتك</span>
            </h1>
            <p className="page-subtitle mt-5 max-w-xl text-sm leading-9 sm:text-base">
              استفساري عن منتج أو بكدج، أو عن فاتورتك ومتابعة توصيلها؟ أرسلي لنا رسالة وسيردّ عليك فريق لونيفا في أقرب وقت.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="badge badge-success"><Clock3 size={12} />نرد في أقرب وقت</span>
              <span className="badge badge-muted"><MessageCircle size={12} />تواصل مباشر</span>
              <span className="badge badge-lav"><ShieldCheck size={12} />بياناتك تبقى معنا</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link href="/catalog/products" className="btn btn-outline px-4 py-2.5 text-[11px]">
                <ArrowLeft size={14} />تصفّح المنتجات
              </Link>
              <Link href="/faq" className="btn btn-soft px-4 py-2.5 text-[11px]">
                الأسئلة الشائعة
              </Link>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}><Mail size={17} /></span>
              <p className="mt-3 text-[12px] font-black" style={{ color: "var(--ink)" }}>البريد الإلكتروني</p>
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`} dir="ltr" className="mono mt-1 block break-all text-[11px] font-bold hover:underline" style={{ color: "var(--brand-strong)" }}>
                  {contactEmail}
                </a>
              ) : (
                <p className="mt-1 text-[11px] muted">غير متاح حاليًا</p>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}><Phone size={17} /></span>
              <p className="mt-3 text-[12px] font-black" style={{ color: "var(--ink)" }}>الهاتف</p>
              {settings.companyPhone ? (
                <a href={`tel:${settings.companyPhone.replace(/\s+/g, "")}`} dir="ltr" className="mono mt-1 block break-all text-[11px] font-bold hover:underline" style={{ color: "var(--brand-strong)" }}>
                  {settings.companyPhone}
                </a>
              ) : (
                <p className="mt-1 text-[11px] muted">أرسلي رسالة وسنصلك</p>
              )}
            </div>

            <div className="rounded-2xl p-4 sm:col-span-2" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}><MapPin size={17} /></span>
              <p className="mt-3 text-[12px] font-black" style={{ color: "var(--ink)" }}>العنوان</p>
              <p className="mt-1 text-[11px] leading-6 muted">{settings.companyAddress || "تصفّحي الكتالوج العام لأي استفسار عن المنتجات والبكدجات."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <ContactForm />

        <aside className="min-w-0 space-y-4">
          <div className="app-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                <Clock3 size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="section-title">متى نتواصل معك؟</h2>
                <p className="mt-0.5 text-[11px] muted-2">نرتب الردود حسب ورود الرسائل.</p>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-8 muted">
              نراجع الرسائل بشكل مستمر ونرد عليك على البريد الذي تكتبه في النموذج. إذا كانت رسالتك عن فاتورة معينة، يفضّل ذكر رقم الإيصال أو رقم الفاتورة لتسريع الرد.
            </p>
          </div>

          <div className="app-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
                <ShieldCheck size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="section-title">خصوصيتك أولًا</h2>
                <p className="mt-0.5 text-[11px] muted-2">بياناتك تُستخدم للرد عليك فقط.</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5 text-[12px] leading-7 muted">
              <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-1 shrink-0" style={{ color: "var(--success)" }} />لا نشارك بياناتك مع أطراف أخرى.</li>
              <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-1 shrink-0" style={{ color: "var(--success)" }} />رابط الفاتورة يبقى خاصًا بك ولا يُعرض في الكتالوج.</li>
              <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-1 shrink-0" style={{ color: "var(--success)" }} />يمكنك مراجعة سياسة الخصوصية في أي وقت.</li>
            </ul>
            <Link href="/privacy" className="btn btn-outline mt-5 w-full text-[11px]">
              قراءة سياسة الخصوصية
            </Link>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, var(--plum), var(--brand-strong))", color: "#fff" }}
          >
            <p className="text-xs font-black tracking-[0.14em] text-white/70">لونيفا</p>
            <h2 className="mt-2 text-lg font-extrabold">إجابة سريعة؟</h2>
            <p className="mt-2 text-[12px] leading-7 text-white/75">
              معظم الأسئلة عن الكتالوج والفواتير والتوصيل تجد إجابتها في صفحة الأسئلة الشائعة.
            </p>
            <Link href="/faq" className="btn mt-4 w-full bg-white text-[#7c4354] hover:bg-white/90">
              افتح الأسئلة الشائعة
            </Link>
          </div>
        </aside>
      </section>
    </PublicSiteShell>
  );
}
