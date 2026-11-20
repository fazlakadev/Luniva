import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, Heart, Layers3, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import HomeAtmosphere from "@/components/motion/home-atmosphere";
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
          section === "home" || section === "about" ? "fixed inset-x-0 top-0" : "sticky top-0"
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
          section === "home" || section === "about"
            ? "relative z-10 w-full"
            : "relative z-10 mx-auto w-full max-w-7xl px-3 pb-16 pt-6 sm:px-6 sm:pb-20 md:pb-14"
        }
      >
        {children}
      </div>
      <SocialRail email={contactEmail} phone={settings.companyPhone} />

      <footer
        className="site-footer relative z-10 mt-14 overflow-hidden border-t pb-14 sm:pb-8 md:pb-0"
        style={{
          borderColor: "var(--line)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--surface) 84%, transparent), color-mix(in srgb, var(--brand-soft) 42%, var(--bg)))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--brand), var(--lav), transparent)" }}
        />

        {/* Top CTA Card */}
        <div className="mx-auto w-full max-w-7xl px-3 pt-6 sm:px-6 sm:pt-8">
          <div
            className="relative overflow-hidden rounded-[1.75rem] border p-5 sm:p-8"
            style={{
              borderColor: "color-mix(in srgb, var(--brand) 28%, transparent)",
              background: "linear-gradient(135deg, var(--plum), color-mix(in srgb, var(--lav) 76%, var(--plum)))",
              boxShadow: "0 12px 32px -8px rgba(74, 18, 64, 0.4)",
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
            <div className="relative flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black text-white/95">
                  <Sparkles size={11} className="text-pink-300" />لونيفا · تسوّق بثقة
                </span>
                <h2 className="mt-2.5 text-base font-black leading-snug text-white sm:text-xl">
                  اختاري ما يناسبك من تفاصيل واضحة وأسعار نهائية
                </h2>
                <p className="mt-1.5 text-[11px] leading-5 text-white/75 sm:leading-6">
                  تصفّحي التشكيلة كاملة، وقارني بين القطع والبكدجات، واعرفي كل التفاصيل قبل أن تقرري.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href="/catalog/products"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#6a3b4e] shadow-lg transition active:scale-95 hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  تصفّح المنتجات <ArrowUpLeft size={14} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-black text-white transition active:scale-95 hover:bg-white/20 motion-reduce:transition-none"
                >
                  تواصل معنا <ArrowUpLeft size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="mx-auto w-full max-w-7xl px-3 py-8 sm:px-6 sm:py-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {/* Brand identity column */}
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
                  <p className="text-[9px] font-bold tracking-wider" style={{ color: "var(--muted-2)" }}>LUNIVA</p>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] leading-6 muted">
                {settings.companyTagline || "تشكيلة مختارة من الأزياء والبكدجات، بألوان ومقاسات وأسعار واضحة ومدروسة."}
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                <span className="badge badge-muted text-[10px]"><ShieldCheck size={11} />أسعار نهائية</span>
                <span className="badge badge-muted text-[10px]"><Sparkles size={11} />تفاصيل واضحة</span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[10.5px] font-black" style={{ color: "var(--brand-strong)" }}>
                <Heart size={12} className="text-rose-500 fill-rose-500/20" />شركة ملابس نسائية مصرية · ٢٠٢٦
              </p>
            </div>

            {/* Mobile 2-column links block */}
            <div className="grid grid-cols-2 gap-4 sm:contents">
              {/* Catalog Links */}
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-black" style={{ color: "var(--ink)" }}>
                  <span className="h-3.5 w-1 rounded-full" style={{ background: "var(--brand)" }} />
                  التصفّح
                </p>
                <div className="mt-3 space-y-2">
                  {CATALOG_FOOTER_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block text-[11.5px] font-bold transition hover:translate-x-[-3px] hover:text-[var(--brand-strong)] active:scale-95 motion-reduce:transition-none"
                      style={{ color: "var(--muted)" }}
                    >
                      {label}
                    </Link>
                  ))}
                  <Link
                    href="/shoes"
                    className="block text-[11.5px] font-bold transition hover:translate-x-[-3px] hover:text-[var(--brand-strong)] active:scale-95 motion-reduce:transition-none"
                    style={{ color: "var(--muted)" }}
                  >
                    الأحذية
                  </Link>
                </div>
              </div>

              {/* About & Support Links */}
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-black" style={{ color: "var(--ink)" }}>
                  <span className="h-3.5 w-1 rounded-full" style={{ background: "var(--lav)" }} />
                  عن لونيفا
                </p>
                <div className="mt-3 space-y-2">
                  {[...ABOUT_FOOTER_LINKS, ...SUPPORT_FOOTER_LINKS].map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block text-[11.5px] font-bold transition hover:translate-x-[-3px] hover:text-[var(--brand-strong)] active:scale-95 motion-reduce:transition-none"
                      style={{ color: "var(--muted)" }}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact quick card */}
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <div
                className="rounded-2xl border p-4 shadow-sm"
                style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
              >
                <p className="flex items-center gap-2 text-xs font-black" style={{ color: "var(--ink)" }}>
                  <span className="h-3.5 w-1 rounded-full" style={{ background: "var(--success)" }} />
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
                    <p className="leading-6">فريق لونيفا جاهز لمساعدتك والرد على استفساراتك دائماً.</p>
                  )}
                </div>
                <Link
                  href="/contact"
                  className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black transition active:scale-98 hover:-translate-y-0.5 motion-reduce:transition-none"
                  style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                >
                  أرسل رسالة فورية <ArrowUpLeft size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mx-auto w-full max-w-7xl px-3 pb-4 sm:px-6">
          <NewsletterForm />
        </div>

        {/* Bottom Copyright & Legal Links */}
        <div className="border-t pb-[calc(1rem+env(safe-area-inset-bottom))]" style={{ borderColor: "var(--line)" }}>
          <div
            className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-3 py-4 text-center text-[10.5px] sm:flex-row sm:px-6 sm:text-right"
            style={{ color: "var(--muted-2)" }}
          >
            <span className="font-medium">
              © {new Date().getFullYear().toLocaleString("ar-EG")} لونيفا · شركة ملابس نسائية مصرية · جميع الحقوق محفوظة
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/contact" className="font-black hover:underline" style={{ color: "var(--brand-strong)" }}>تواصل معنا</Link>
              {SUPPORT_FOOTER_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="font-semibold transition hover:text-[var(--brand-strong)]" style={{ color: "var(--muted)" }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
