import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gift, Layers3, Package, ShieldCheck, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import { getSettings } from "@/lib/settings";

type PublicSection = "home" | "catalog" | "product" | "package";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية", icon: Sparkles, key: "home" as const },
  { href: "/catalog", label: "الكتالوج", icon: Layers3, key: "catalog" as const },
  { href: "/catalog#products", label: "المنتجات", icon: Package, key: "products" as const },
  { href: "/catalog#packages", label: "البكدجات", icon: Gift, key: "packages" as const },
  { href: "/about", label: "من نحن", icon: ShieldCheck, key: "about" as const },
];

function isLinkActive(key: string, section: PublicSection) {
  if (key === "home") return section === "home";
  if (key === "catalog") return section !== "home";
  if (key === "products") return section === "product";
  if (key === "packages") return section === "package";
  return false;
}

export default async function PublicSiteShell({
  section,
  children,
}: {
  section: PublicSection;
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const primaryHref = section === "home" ? "/catalog" : "/";
  const primaryLabel = section === "home" ? "كتالوج العملاء" : "الرئيسية";

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

      <header className="site-header sticky top-0 z-40 border-b backdrop-blur-xl" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--bg) 86%, transparent)" }}>
        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="لونيفا - الرئيسية">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-sm" style={{ border: "1px solid var(--line)" }}>
              <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} preload className="h-9 w-9 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-tight" style={{ color: "var(--ink)" }}>لونيفا</span>
              <span className="block truncate text-[9px] font-bold" style={{ color: "var(--muted-2)" }}>شركة ملابس نسائية مصرية</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="القائمة الرئيسية">
            {NAV_LINKS.map(({ href, label, icon: Icon, key }) => {
              const active = isLinkActive(key, section);
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold transition"
                  style={{
                    background: active ? "var(--brand-soft)" : "transparent",
                    color: active ? "var(--brand-strong)" : "var(--muted)",
                  }}
                >
                  <Icon size={13} />{label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link href={primaryHref} className="btn btn-primary px-3 py-2 text-[11px]">
              <ArrowLeft size={13} />{primaryLabel}
            </Link>
            <ThemeToggle showLabel={false} />
          </div>
        </div>

        <nav className="lg:hidden" aria-label="قائمة الجوال">
          <div className="no-scrollbar mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6">
            {NAV_LINKS.map(({ href, label, icon: Icon, key }) => {
              const active = isLinkActive(key, section);
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold"
                  style={{
                    background: active ? "var(--brand-soft)" : "var(--surface-2)",
                    color: active ? "var(--brand-strong)" : "var(--muted)",
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
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-3 py-10 sm:grid-cols-3 sm:px-6">
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
            <p className="text-[11px] font-black" style={{ color: "var(--ink)" }}>روابط سريعة</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="text-[11px] font-bold transition hover:underline" style={{ color: "var(--muted)" }}>
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
              <Link href="/catalog" className="font-bold" style={{ color: "var(--brand-strong)" }}>الكتالوج</Link>
              <Link href="/about" className="font-bold" style={{ color: "var(--brand-strong)" }}>من نحن</Link>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
