"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  FileText,
  Gift,
  Home,
  Layers3,
  Mail,
  Menu,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/theme-toggle";
import {
  isCatalogSection,
  isSupportSection,
  type PublicSection,
} from "@/lib/public-sections";

type NavLink = {
  href: string;
  label: string;
  icon: typeof Home;
  section: PublicSection;
};

type PublicNavProps = {
  section: PublicSection;
  contactEmail?: string;
  phone?: string;
};

const HOME_LINK: NavLink = { href: "/", label: "الرئيسية", icon: Home, section: "home" };
const ABOUT_LINK: NavLink = { href: "/about", label: "من نحن", icon: Sparkles, section: "about" };
const CONTACT_LINK: NavLink = { href: "/contact", label: "تواصل معنا", icon: Mail, section: "contact" };

const CATALOG_LINKS: NavLink[] = [
  HOME_LINK,
  { href: "/catalog/products", label: "المنتجات", icon: Package, section: "products" },
  { href: "/catalog/packages", label: "البكدجات", icon: Gift, section: "packages" },
];

const SUPPORT_LINKS: NavLink[] = [
  { href: "/faq", label: "الأسئلة الشائعة", icon: CircleHelp, section: "faq" },
  { href: "/privacy", label: "سياسة الخصوصية", icon: ShieldCheck, section: "privacy" },
  { href: "/terms", label: "الشروط والأحكام", icon: FileText, section: "terms" },
];

function resolveActive(pathname: string, section: PublicSection): PublicSection {
  if (pathname.startsWith("/catalog/products")) return "products";
  if (pathname.startsWith("/catalog/packages")) return "packages";
  if (pathname === "/catalog") return "home";
  if (pathname === "/about") return "about";
  if (pathname === "/contact") return "contact";
  if (pathname === "/faq") return "faq";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  if (pathname === "/") return "home";
  return section;
}

function navStyle(active: boolean) {
  return {
    background: active ? "var(--brand-soft)" : "transparent",
    color: active ? "var(--brand-strong)" : "var(--muted)",
    border: active
      ? "1px solid color-mix(in srgb, var(--brand) 24%, transparent)"
      : "1px solid transparent",
  };
}

function dropdownStyle(active: boolean) {
  return {
    borderColor: "var(--line)",
    background: "var(--surface)",
    boxShadow: active ? "var(--shadow-md)" : "var(--shadow-lg)",
  };
}

export default function PublicNav({ section, contactEmail = "", phone = "" }: PublicNavProps) {
  const pathname = usePathname() || "/";
  const active = resolveActive(pathname, section);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  const catalogActive = isCatalogSection(active);
  const supportActive = isSupportSection(active);
  const ctaHref = active === "contact" ? "/catalog/products" : "/contact";
  const ctaLabel = active === "contact" ? "تصفّح المنتجات" : "تواصل معنا";

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="القائمة الرئيسية">
        <Link
          href={HOME_LINK.href}
          aria-current={active === "home" ? "page" : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold transition hover:bg-[var(--brand-soft)]"
          style={navStyle(active === "home")}
        >
          <Home size={14} />الرئيسية
        </Link>

        <div className="group relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-label="قائمة الكتالوج"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold transition"
            style={navStyle(catalogActive)}
          >
            <Layers3 size={14} />الكتالوج
            <ChevronDown size={12} className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
          </button>
          <div
            className="invisible absolute right-0 top-full z-50 mt-2 w-64 translate-y-1 rounded-2xl border p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
            style={dropdownStyle(catalogActive)}
          >
            <p className="px-3 py-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
              تصفّحي لونيفا في مكان واحد
            </p>
            {CATALOG_LINKS.slice(1).map(({ href, label, icon: Icon, section: key }) => (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? "page" : undefined}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)]"
                style={{ color: active === key ? "var(--brand-strong)" : "var(--muted)" }}
              >
                <Icon size={13} />{label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href={ABOUT_LINK.href}
          aria-current={active === "about" ? "page" : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold transition hover:bg-[var(--brand-soft)]"
          style={navStyle(active === "about")}
        >
          <Sparkles size={14} />من نحن
        </Link>

        <div className="group relative">
          <button
            type="button"
            aria-haspopup="true"
            aria-label="قائمة المساعدة والسياسات"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold transition"
            style={navStyle(supportActive)}
          >
            <CircleHelp size={14} />المساعدة
            <ChevronDown size={12} className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
          </button>
          <div
            className="invisible absolute right-0 top-full z-50 mt-2 w-64 translate-y-1 rounded-2xl border p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
            style={dropdownStyle(supportActive)}
          >
            <p className="px-3 py-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
              معلومات تهمّك
            </p>
            {SUPPORT_LINKS.map(({ href, label, icon: Icon, section: key }) => (
              <Link
                key={key}
                href={href}
                aria-current={active === key ? "page" : undefined}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)]"
                style={{ color: active === key ? "var(--brand-strong)" : "var(--muted)" }}
              >
                <Icon size={13} />{label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link href={ctaHref} className="btn btn-primary hidden px-3 py-2 text-[11px] sm:inline-flex">
          <ArrowLeft size={13} />{ctaLabel}
        </Link>
        <span className="hidden sm:inline-flex"><ThemeToggle showLabel={false} /></span>
        <button
          type="button"
          onClick={() => {
            setCatalogOpen(isCatalogSection(active));
            setSupportOpen(isSupportSection(active));
            setDrawerOpen(true);
          }}
          aria-label="فتح قائمة التنقل"
          aria-expanded={drawerOpen}
          className="grid h-10 w-10 place-items-center rounded-xl border lg:hidden"
          style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
        >
          <Menu size={19} />
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
            dir="rtl"
            className="absolute inset-y-0 right-0 flex max-h-screen w-full flex-col overflow-hidden border-l shadow-2xl"
            style={{ width: "min(88vw, 22rem)", borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-4" style={{ borderColor: "var(--line)" }}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  <Sparkles size={19} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black" style={{ color: "var(--ink)" }}>قائمة لونيفا</p>
                  <p className="truncate text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>كل الصفحات في مكان واحد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="إغلاق القائمة"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <DrawerLink link={HOME_LINK} active={active === "home"} onNavigate={() => setDrawerOpen(false)} />

              <DrawerGroup
                label="الكتالوج"
                icon={Layers3}
                open={catalogOpen}
                onToggle={() => setCatalogOpen((value) => !value)}
                active={catalogActive}
              >
                {CATALOG_LINKS.slice(1).map((link) => (
                  <DrawerLink key={link.section} link={link} active={active === link.section} onNavigate={() => setDrawerOpen(false)} nested />
                ))}
              </DrawerGroup>

              <DrawerLink link={ABOUT_LINK} active={active === "about"} onNavigate={() => setDrawerOpen(false)} />
              <DrawerLink link={CONTACT_LINK} active={active === "contact"} onNavigate={() => setDrawerOpen(false)} />

              <DrawerGroup
                label="المساعدة والسياسات"
                icon={CircleHelp}
                open={supportOpen}
                onToggle={() => setSupportOpen((value) => !value)}
                active={supportActive}
              >
                {SUPPORT_LINKS.map((link) => (
                  <DrawerLink key={link.section} link={link} active={active === link.section} onNavigate={() => setDrawerOpen(false)} nested />
                ))}
              </DrawerGroup>

              {(contactEmail || phone) && (
                <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <p className="text-[11px] font-black" style={{ color: "var(--ink)" }}>تحتاج مساعدة؟</p>
                  <div className="mt-2 space-y-1.5 text-[11px] font-bold" style={{ color: "var(--muted)" }}>
                    {contactEmail && (
                      <a href={`mailto:${contactEmail}`} dir="ltr" className="flex items-center gap-2 hover:underline" style={{ color: "var(--brand-strong)" }}>
                        <Mail size={13} className="shrink-0" />{contactEmail}
                      </a>
                    )}
                    {phone && (
                      <a href={`tel:${phone.replace(/\s+/g, "")}`} dir="ltr" className="flex items-center gap-2 hover:underline" style={{ color: "var(--brand-strong)" }}>
                        <Phone size={13} className="shrink-0" />{phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: "var(--line)" }}>
              <span className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>لونيفا · شركة ملابس نسائية مصرية</span>
              <ThemeToggle showLabel={false} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function DrawerLink({
  link,
  active,
  nested = false,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  nested?: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`mb-1 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] font-extrabold transition ${nested ? "mr-4" : ""}`}
      style={{
        background: active ? "var(--brand-soft)" : "transparent",
        borderColor: active ? "color-mix(in srgb, var(--brand) 24%, transparent)" : "transparent",
        color: active ? "var(--brand-strong)" : "var(--ink-soft)",
      }}
    >
      <Icon size={15} className="shrink-0" />
      <span className="min-w-0 truncate">{link.label}</span>
      {active && <span className="mr-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand)" }} />}
    </Link>
  );
}

function DrawerGroup({
  label,
  icon: Icon,
  open,
  onToggle,
  active,
  children,
}: {
  label: string;
  icon: typeof Home;
  open: boolean;
  onToggle: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-extrabold transition"
        style={{
          background: active ? "var(--brand-soft)" : "transparent",
          borderColor: active ? "color-mix(in srgb, var(--brand) 24%, transparent)" : "transparent",
          color: active ? "var(--brand-strong)" : "var(--ink-soft)",
        }}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon size={15} className="shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-1 border-r pr-1" style={{ borderColor: "var(--line)" }}>{children}</div>}
    </div>
  );
}
