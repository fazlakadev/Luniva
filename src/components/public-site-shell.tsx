import Image from "next/image";
import Link from "next/link";
import { Layers3, Mail, ShieldCheck, Sparkles } from "lucide-react";
import HomeAtmosphere from "@/components/motion/home-atmosphere";
import MobileGooeyNav from "@/components/motion/mobile-gooey-nav";
import PublicNav from "@/components/public-nav";
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

      <header className="site-header sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
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
      <MobileGooeyNav />

      <footer
        className="site-footer relative z-10 mt-14 border-t pb-20 md:pb-0"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
      >
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-3 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm"
                style={{ border: "1px solid var(--line)" }}
              >
                <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={96} height={96} className="h-8 w-8 object-contain" />
              </span>
              <span className="text-base font-black" style={{ color: "var(--ink)" }}>لونيفا</span>
            </div>
            <p className="mt-3 max-w-xs text-[11px] leading-6 muted">
              {settings.companyTagline || "تشكيلة مختارة من المنتجات والبكدجات، بألوان ومقاسات وأسعار واضحة."}
            </p>
            <p className="mt-2 text-[10px] font-bold" style={{ color: "var(--brand-strong)" }}>
              شركة ملابس نسائية مصرية · تأسست عام 2026
            </p>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-black" style={{ color: "var(--ink)" }}>
              <Layers3 size={13} />التصفّح
            </p>
            <div className="mt-3 space-y-2">
              {CATALOG_FOOTER_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="block text-[11px] font-bold transition hover:underline" style={{ color: "var(--muted)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-black" style={{ color: "var(--ink)" }}>
              <Sparkles size={13} />عن لونيفا
            </p>
            <div className="mt-3 space-y-2">
              {[...ABOUT_FOOTER_LINKS, ...SUPPORT_FOOTER_LINKS].map(({ href, label }) => (
                <Link key={href} href={href} className="block text-[11px] font-bold transition hover:underline" style={{ color: "var(--muted)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-black" style={{ color: "var(--ink)" }}>
              <Mail size={13} />تواصل معنا
            </p>
            <div className="mt-3 space-y-2 text-[11px] font-bold" style={{ color: "var(--muted)" }}>
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} dir="ltr" className="block break-all text-right hover:underline" style={{ color: "var(--brand-strong)" }}>
                  {contactEmail}
                </a>
              )}
              {settings.companyPhone && (
                <a href={`tel:${settings.companyPhone.replace(/\s+/g, "")}`} dir="ltr" className="mono block text-right hover:underline" style={{ color: "var(--brand-strong)" }}>
                  {settings.companyPhone}
                </a>
              )}
              {settings.companyAddress && <p className="leading-6">{settings.companyAddress}</p>}
              {!contactEmail && !settings.companyPhone && !settings.companyAddress && (
                <p className="leading-6">تصفّحي التفاصيل الكاملة لكل قطعة وبكدج قبل اتخاذ قرارك.</p>
              )}
              <Link href="/contact" className="inline-flex items-center gap-1.5 pt-1 font-black hover:underline" style={{ color: "var(--brand-strong)" }}>
                أرسل رسالة <Mail size={12} />
              </Link>
              <p className="flex items-center gap-1.5 pt-1 text-[10px]" style={{ color: "var(--muted-2)" }}>
                <ShieldCheck size={12} />أسعار نهائية وتفاصيل واضحة
              </p>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--line)" }}>
          <div
            className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-3 py-4 text-center text-[10px] sm:flex-row sm:px-6 sm:text-right"
            style={{ color: "var(--muted-2)" }}
          >
            <span>© {new Date().getFullYear()} لونيفا · شركة ملابس نسائية مصرية · جميع الحقوق محفوظة</span>
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
