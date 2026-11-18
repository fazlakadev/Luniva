import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, Heart, Layers3, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import HomeAtmosphere from "@/components/motion/home-atmosphere";
import MobileGooeyNav from "@/components/motion/mobile-gooey-nav";
import NewsletterForm from "@/components/newsletter-form";
import PublicNav from "@/components/public-nav";
import SocialRail from "@/components/social-rail";
import { getSettings } from "@/lib/settings";
import type { PublicSection } from "@/lib/public-sections";

const CATALOG_FOOTER_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/catalog/products", label: "المنتجات" },
  { href: "/catalog/packages", label: "البكدجات" },
];

const ABOUT_FOOTER_LINKS = [
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "تواصل معنا" },
];

const SUPPORT_FOOTER_LINKS = [
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/privacy", label: "سياسة الخصوصية" },
  { href: "/terms", label: "الشروط والأحكام" },
];

export default async function PublicSiteShell({
  section,
  children,
}: {
  section: PublicSection;
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const contactEmail = process.env.RECEIVER_EMAIL || process.env.EMAIL_USER || "";

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
            "radial-gradient(circle at 10% 0%, var(--brand-soft) 0, transparent 34%), radial-gradient(circle at 92% 18%, var(--lav-soft) 0, transparent 30%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.26]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand) 22%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at top, black, transparent 68%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black, transparent 68%)",
        }}
      />

      {section === "home" && <HomeAtmosphere />}

      <header
        className={`site-header z-40 px-3 pt-3 sm:px-6 sm:pt-4 ${
          section === "home" ? "fixed inset-x-0 top-0" : "sticky top-0"
        }`}
      >
        <div
          className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-[1.5rem] border px-3 py-2.5 backdrop-blur-2xl sm:px-4 sm:py-3"
          style={{
            borderColor: "color-mix(in srgb, var(--line) 80%, transparent)",
            background: "color-mix(in srgb, var(--surface) 72%, transparent)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label="لونيفا - الرئيسية">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm sm:h-11 sm:w-11"
              style={{ border: "1px solid var(--line)" }}
            >
              <Image
                src="/luniva-logo-v2.png"
                alt="شعار لونيفا"
                width={128}
                height={128}
                preload
                className="h-8 w-8 object-contain sm:h-9 sm:w-9"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-tight sm:text-base" style={{ color: "var(--ink)" }}>
                لونيفا
              </span>
              <span className="hidden truncate text-[9px] font-bold sm:block" style={{ color: "var(--muted-2)" }}>
                شركة ملابس نسائية مصرية
              </span>
            </span>
          </Link>

          <PublicNav section={section} contactEmail={contactEmail} phone={settings.companyPhone} />
        </div>
      </header>

      <div
        className={
          section === "home"
            ? "relative z-10 w-full"
            : "relative z-10 mx-auto w-full max-w-7xl px-3 pb-24 pt-6 sm:px-6 sm:pb-14 md:pb-14"
        }
      >
        {children}
      </div>
      <SocialRail email={contactEmail} phone={settings.companyPhone} />
      <MobileGooeyNav />

      <footer
        className="site-footer relative z-10 mt-14 overflow-hidden border-t pb-20 md:pb-0"
        style={{
          borderColor: "var(--line)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--surface) 78%, transparent), color-mix(in srgb, var(--brand-soft) 46%, var(--bg)))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--brand), var(--lav), transparent)" }}
        />

        <div className="mx-auto w-full max-w-7xl px-3 pt-8 sm:px-6 sm:pt-10">
          <div
            className="relative overflow-hidden rounded-[1.75rem] border px-5 py-6 sm:px-8 sm:py-8"
            style={{
              borderColor: "color-mix(in srgb, var(--brand) 24%, transparent)",
              background: "linear-gradient(135deg, var(--plum), color-mix(in srgb, var(--lav) 76%, var(--plum)))",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ background: "var(--brand)" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 right-10 h-52 w-52 rounded-full opacity-25 blur-3xl"
              style={{ background: "#fff" }}
            />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black text-white/90">
                  <Sparkles size={11} />لونيفا · تسوّق بثقة
                </span>
                <h2 className="mt-3 text-lg font-black leading-relaxed text-white sm:text-xl">
                  اختاري ما يناسبك من تفاصيل واضحة وأسعار نهائية
                </h2>
                <p className="mt-2 text-[11px] leading-6 text-white/70">
                  تصفّحي التشكيلة كاملة، وقارني بين القطع والبكدجات، واعرفي كل التفاصيل قبل أن تقرري.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/catalog/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[11px] font-black text-[#6a3b4e] shadow-lg transition hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  تصفّح المنتجات <ArrowUpLeft size={14} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-[11px] font-black text-white/90 transition hover:bg-white/10 motion-reduce:transition-none"
                >
                  تواصل معنا <ArrowUpLeft size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-8 px-3 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-sm"
                style={{ border: "1px solid var(--line)" }}
              >
                <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={96} height={96} className="h-8 w-8 object-contain" />
              </span>
              <div>
                <p className="text-base font-black" style={{ color: "var(--ink)" }}>لونيفا</p>
                <p className="text-[9px] font-bold" style={{ color: "var(--muted-2)" }}>LUNIVA</p>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-[11px] leading-6 muted">
              {settings.companyTagline || "تشكيلة مختارة من المنتجات والبكدجات، بألوان ومقاسات وأسعار واضحة."}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="badge badge-muted"><ShieldCheck size={11} />أسعار نهائية</span>
              <span className="badge badge-muted"><Sparkles size={11} />تفاصيل واضحة</span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--brand-strong)" }}>
              <Heart size={11} />شركة ملابس نسائية مصرية · ٢٠٢٦
            </p>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-black" style={{ color: "var(--ink)" }}>
              <span className="h-4 w-1 rounded-full" style={{ background: "var(--brand)" }} />
              التصفّح
            </p>
            <div className="mt-3 space-y-2">
              {CATALOG_FOOTER_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block w-fit text-[11px] font-bold transition hover:translate-x-[-2px] hover:text-[var(--brand-strong)] motion-reduce:transition-none"
                  style={{ color: "var(--muted)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-black" style={{ color: "var(--ink)" }}>
              <span className="h-4 w-1 rounded-full" style={{ background: "var(--lav)" }} />
              عن لونيفا
            </p>
            <div className="mt-3 space-y-2">
              {[...ABOUT_FOOTER_LINKS, ...SUPPORT_FOOTER_LINKS].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block w-fit text-[11px] font-bold transition hover:translate-x-[-2px] hover:text-[var(--brand-strong)] motion-reduce:transition-none"
                  style={{ color: "var(--muted)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 76%, transparent)" }}
            >
              <p className="flex items-center gap-2 text-[11px] font-black" style={{ color: "var(--ink)" }}>
                <span className="h-4 w-1 rounded-full" style={{ background: "var(--success)" }} />
                تواصل معنا
              </p>
              <div className="mt-3 space-y-2.5 text-[11px] font-bold" style={{ color: "var(--muted)" }}>
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} dir="ltr" className="flex items-center justify-end gap-1.5 break-all text-right hover:underline" style={{ color: "var(--brand-strong)" }}>
                    {contactEmail}<Mail size={12} className="shrink-0" />
                  </a>
                )}
                {settings.companyPhone && (
                  <a href={`tel:${settings.companyPhone.replace(/\s+/g, "")}`} dir="ltr" className="mono flex items-center justify-end gap-1.5 text-right hover:underline" style={{ color: "var(--brand-strong)" }}>
                    {settings.companyPhone}<Phone size={12} className="shrink-0" />
                  </a>
                )}
                {settings.companyAddress && (
                  <p className="flex items-start justify-end gap-1.5 leading-6">
                    {settings.companyAddress}<MapPin size={12} className="mt-1 shrink-0" />
                  </p>
                )}
                {!contactEmail && !settings.companyPhone && !settings.companyAddress && (
                  <p className="leading-6">تصفّحي التفاصيل الكاملة لكل قطعة وبكدج قبل اتخاذ قرارك.</p>
                )}
              </div>
              <Link
                href="/contact"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10px] font-black transition hover:-translate-y-0.5 motion-reduce:transition-none"
                style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
              >
                أرسل رسالة <ArrowUpLeft size={13} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-3 pb-2 sm:px-6">
          <NewsletterForm />
        </div>

        <div className="border-t" style={{ borderColor: "var(--line)" }}>
          <div
            className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-3 py-5 text-center text-[10px] sm:flex-row sm:px-6 sm:text-right"
            style={{ color: "var(--muted-2)" }}
          >
            <span>
              © {new Date().getFullYear().toLocaleString("ar-EG")} لونيفا · شركة ملابس نسائية مصرية · جميع الحقوق محفوظة
            </span>
            <span className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/contact" className="font-bold" style={{ color: "var(--brand-strong)" }}>تواصل معنا</Link>
              {SUPPORT_FOOTER_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="font-bold" style={{ color: "var(--brand-strong)" }}>{label}</Link>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
