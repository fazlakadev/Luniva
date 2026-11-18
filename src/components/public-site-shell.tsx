import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  FileText,
  Gift,
  Layers3,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import { getSettings } from "@/lib/settings";

export type PublicSection =
  | "home"
  | "catalog"
  | "product"
  | "package"
  | "about"
  | "privacy"
  | "terms"
  | "faq";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Layers3;
  key: PublicSection | "products" | "packages";
};

const CATALOG_LINKS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: Sparkles, key: "home" },
  { href: "/catalog", label: "كل الكتالوج", icon: Layers3, key: "catalog" },
  { href: "/catalog#products", label: "المنتجات", icon: Package, key: "products" },
  { href: "/catalog#packages", label: "البكدجات", icon: Gift, key: "packages" },
];

const ABOUT_LINKS: NavItem[] = [
  { href: "/about", label: "من نحن", icon: ShieldCheck, key: "about" },
];

const HELP_LINKS: NavItem[] = [
  { href: "/faq", label: "الأسئلة الشائعة", icon: CircleHelp, key: "faq" },
  { href: "/privacy", label: "سياسة الخصوصية", icon: ShieldCheck, key: "privacy" },
  { href: "/terms", label: "الشروط والأحكام", icon: FileText, key: "terms" },
];

const ALL_NAV_LINKS = [...CATALOG_LINKS, ...ABOUT_LINKS, ...HELP_LINKS];

function isActive(key: string, section: PublicSection) {
  return key === section;
}

function isCatalogSection(section: PublicSection) {
  return section === "home" || section === "catalog" || section === "product" || section === "package";
}

function navStyle(active: boolean, compact = false) {
  return {
    background: active ? "var(--brand-soft)" : "transparent",
    color: active ? "var(--brand-strong)" : "var(--muted)",
    border: active ? "1px solid color-mix(in srgb, var(--brand) 24%, transparent)" : "1px solid transparent",
    fontSize: compact ? "10px" : "11px",
  };
}

export default async function PublicSiteShell({
  section,
  children,
}: {
  section: PublicSection;
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const catalogActive = isCatalogSection(section);
  const helpActive = section === "faq" || section === "privacy" || section === "terms";
  const primaryHref = catalogActive ? "/catalog#products" : "/";
  const primaryLabel = catalogActive ? "تصفّح المنتجات" : "الرئيسية";
  const primaryLabelShort = catalogActive ? "المنتجات" : "الرئيسية";

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

      <header className="site-header sticky top-0 z-40 border-b backdrop-blur-xl" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5" aria-label="لونيفا - الرئيسية">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm sm:h-11 sm:w-11" style={{ border: "1px solid var(--line)" }}>
              <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} preload className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-tight sm:text-base" style={{ color: "var(--ink)" }}>لونيفا</span>
              <span className="hidden truncate text-[9px] font-bold sm:block" style={{ color: "var(--muted-2)" }}>شركة ملابس نسائية مصرية</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="القائمة الرئيسية">
            <div className="group relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-label="قائمة الكتالوج"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-extrabold transition"
                style={navStyle(catalogActive)}
              >
                <Layers3 size={13} />الكتالوج<ChevronDown size={12} className="transition group-hover:rotate-180" />
              </button>
              <div
                className="invisible absolute right-0 top-full z-50 mt-2 w-64 translate-y-1 rounded-2xl border p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                <p className="px-3 py-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>تصفّحي لونيفا في مكان واحد</p>
                {CATALOG_LINKS.map(({ href, label, icon: Icon, key }) => (
                  <Link
                    key={key}
                    href={href}
                    aria-current={isActive(key, section) ? "page" : undefined}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)]"
                    style={{ color: isActive(key, section) ? "var(--brand-strong)" : "var(--muted)" }}
                  >
                    <Icon size={13} />{label}
                  </Link>
                ))}
              </div>
            </div>

            {ABOUT_LINKS.map(({ href, label, icon: Icon, key }) => (
              <Link
                key={key}
                href={href}
                aria-current={isActive(key, section) ? "page" : undefined}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-extrabold transition"
                style={navStyle(isActive(key, section))}
              >
                <Icon size={13} />{label}
              </Link>
            ))}

            <div className="group relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-label="قائمة المساعدة والسياسات"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-extrabold transition"
                style={navStyle(helpActive)}
              >
                <CircleHelp size={13} />المساعدة<ChevronDown size={12} className="transition group-hover:rotate-180" />
              </button>
              <div
                className="invisible absolute right-0 top-full z-50 mt-2 w-64 translate-y-1 rounded-2xl border p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                <p className="px-3 py-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>معلومات تهمّك</p>
                {HELP_LINKS.map(({ href, label, icon: Icon, key }) => (
                  <Link
                    key={key}
                    href={href}
                    aria-current={isActive(key, section) ? "page" : undefined}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)]"
                    style={{ color: isActive(key, section) ? "var(--brand-strong)" : "var(--muted)" }}
                  >
                    <Icon size={13} />{label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href={primaryHref} className="btn btn-primary px-2.5 py-2 text-[10px] sm:px-3 sm:text-[11px]" aria-label={primaryLabel}>
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">{primaryLabel}</span>
              <span className="sm:hidden">{primaryLabelShort}</span>
            </Link>
            <ThemeToggle showLabel={false} />
          </div>
        </div>

        <nav className="lg:hidden" aria-label="قائمة الجوال">
          <div className="mobile-scroll mx-auto flex w-full max-w-7xl gap-1 px-3 pb-2.5 pt-2 sm:px-6">
            {ALL_NAV_LINKS.map(({ href, label, icon: Icon, key }) => {
              const active = isActive(key, section);
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-extrabold"
                  style={{
                    ...navStyle(active, true),
                    background: active ? "var(--brand-soft)" : "var(--surface-2)",
                    border: `1px solid ${active ? "color-mix(in srgb, var(--brand) 24%, transparent)" : "var(--line)"}`,
                  }}
                >
                  <Icon size={12} />{label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="relative mx-auto w-full max-w-7xl px-3 pb-10 pt-6 sm:px-6 sm:pb-14">{children}</div>

      <footer className="site-footer relative mt-14 border-t" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 72%, transparent)" }}>
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-3 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm" style={{ border: "1px solid var(--line)" }}>
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
            <p className="text-[11px] font-black" style={{ color: "var(--ink)" }}>التصفّح</p>
            <div className="mt-3 space-y-2">
              {CATALOG_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="block text-[11px] font-bold transition hover:underline" style={{ color: "var(--muted)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black" style={{ color: "var(--ink)" }}>عن لونيفا</p>
            <div className="mt-3 space-y-2">
              {[...ABOUT_LINKS, ...HELP_LINKS].map(({ href, label }) => (
                <Link key={href} href={href} className="block text-[11px] font-bold transition hover:underline" style={{ color: "var(--muted)" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black" style={{ color: "var(--ink)" }}>تواصل معنا</p>
            <div className="mt-3 space-y-2 text-[11px] font-bold" style={{ color: "var(--muted)" }}>
              {settings.companyPhone && (
                <a href={`tel:${settings.companyPhone.replace(/\s+/g, "")}`} dir="ltr" className="mono block text-right hover:underline" style={{ color: "var(--brand-strong)" }}>
                  {settings.companyPhone}
                </a>
              )}
              {settings.companyAddress && <p className="leading-6">{settings.companyAddress}</p>}
              {!settings.companyPhone && !settings.companyAddress && (
                <p className="leading-6">تصفّحي التفاصيل الكاملة لكل قطعة وبكدج قبل اتخاذ قرارك.</p>
              )}
              <p className="flex items-center gap-1.5 pt-1 text-[10px]" style={{ color: "var(--muted-2)" }}>
                <ShieldCheck size={12} />أسعار نهائية وتفاصيل واضحة
              </p>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--line)" }}>
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-3 py-4 text-center text-[10px] sm:flex-row sm:px-6 sm:text-right" style={{ color: "var(--muted-2)" }}>
            <span>© {new Date().getFullYear()} لونيفا · شركة ملابس نسائية مصرية · جميع الحقوق محفوظة</span>
            <span className="flex flex-wrap items-center justify-center gap-3">
              {HELP_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="font-bold" style={{ color: "var(--brand-strong)" }}>{label}</Link>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
