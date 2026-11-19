"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  FileText,
  Footprints,
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
import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import HeaderSearch from "@/components/header-search";
import ThemeToggle from "@/components/theme-toggle";
import LiquidNavbar, {
  NimbusIcons,
  type LiquidNavItem,
} from "@/components/ui/nimbus-liquid-nav";
import {
  isCatalogMenuActive,
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

type NavKey = PublicSection | "shoes";
type DropdownKey = "catalog" | "support";

const HOME_LINK: NavLink = { href: "/", label: "الرئيسية", icon: Home, section: "home" };
const ABOUT_LINK: NavLink = { href: "/about", label: "من نحن", icon: Sparkles, section: "about" };
const SHOES_LINK: NavLink = { href: "/shoes", label: "الأحذية", icon: Footprints, section: "products" };
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

// The pills keep every icon's little water scene from the supplied component.
// Catalog + Help are buttons (no href) so they can open the preserved dropdowns.
const LIQUID_ITEMS: LiquidNavItem[] = [
  { label: "الرئيسية", href: "/", icon: NimbusIcons.home, fx: "glow" },
  { label: "الكتالوج", icon: NimbusIcons.globe, fx: "spin" },
  { label: "من نحن", href: "/about", icon: <Sparkles size={16} />, fx: "pop" },
  { label: "الأحذية", href: "/shoes", icon: <Footprints size={16} />, fx: "wave" },
  { label: "المساعدة", icon: <CircleHelp size={16} />, fx: "drop" },
  { label: "تواصل", href: "/contact", icon: <Mail size={16} />, fx: "pop" },
];

const CATALOG_LABEL = "الكتالوج";
const SUPPORT_LABEL = "المساعدة";

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

// Home is only lit on the real homepage — never on /catalog, /shoes, etc.
function resolveNavKey(pathname: string, section: PublicSection): NavKey {
  if (pathname.startsWith("/shoes")) return "shoes";
  if (pathname === "/") return "home";
  const resolved = resolveActive(pathname, section);
  return resolved === "home" ? "products" : resolved;
}

function liquidIndex(key: NavKey) {
  switch (key) {
    case "products":
    case "product":
    case "packages":
    case "package":
      return 1;
    case "about":
      return 2;
    case "shoes":
      return 3;
    case "faq":
    case "privacy":
    case "terms":
      return 4;
    case "contact":
      return 5;
    default:
      return 0;
  }
}

function dropdownStyle(active: boolean) {
  return {
    borderColor: "var(--line)",
    background: "var(--surface)",
    boxShadow: active ? "var(--shadow-md)" : "var(--shadow-lg)",
  };
}

function dropdownState(open: boolean) {
  return open
    ? "visible translate-y-0 opacity-100"
    : "invisible translate-y-1 opacity-0 pointer-events-none";
}

export default function PublicNav({ section, contactEmail = "", phone = "" }: PublicNavProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const navKey = resolveNavKey(pathname, section);
  const active = resolveActive(pathname, section);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<DropdownKey | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  const navWrapRef = useRef<HTMLDivElement>(null);

  // The drawer is portalled out of the blurred header. Rendering the portal
  // only on the client keeps the server markup deterministic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  // Follow the same document class / storage key used by ThemeToggle so the
  // water tint always matches the active light/dark theme.
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onStorage = (event: StorageEvent) => {
      if (event.key === "luniva_theme" || event.key === "luniva-theme") sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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

  // Close the hover/click dropdowns on outside interaction or Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (event: globalThis.MouseEvent) => {
      if (navWrapRef.current && !navWrapRef.current.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const catalogActive = isCatalogMenuActive(active) && navKey !== "shoes";
  const supportActive = isSupportSection(active);
  const ctaHref = active === "contact" ? "/catalog/products" : "/contact";
  const ctaLabel = active === "contact" ? "تصفّح المنتجات" : "تواصل معنا";

  const menuFromTarget = (target: EventTarget | null): DropdownKey | null => {
    const element = target as HTMLElement | null;
    const pill = element?.closest?.(".nimbus-item");
    const label = pill?.getAttribute("aria-label");
    if (label === CATALOG_LABEL) return "catalog";
    if (label === SUPPORT_LABEL) return "support";
    return null;
  };

  const onPillHover = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-nav-dropdown]")) return;
    const pill = target.closest(".nimbus-item");
    // Ignore the small gap between pill and panel so the pointer can travel.
    if (!pill) return;
    setOpenMenu(menuFromTarget(pill));
  };

  const onPillFocus = (event: FocusEvent<HTMLDivElement>) => {
    setOpenMenu(menuFromTarget(event.target));
  };

  const onPillClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // The supplied nav renders plain anchors; keep Next.js client navigation.
    const anchor = target.closest("a.nimbus-item[href]");
    if (
      anchor &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.button === 0
    ) {
      const href = anchor.getAttribute("href");
      if (href?.startsWith("/")) {
        event.preventDefault();
        setOpenMenu(null);
        router.push(href);
        return;
      }
    }
    const menu = menuFromTarget(target);
    setOpenMenu((current) => (menu ? (current === menu ? null : menu) : null));
  };

  return (
    <>
      <div
        ref={navWrapRef}
        className="relative hidden min-w-0 shrink items-center lg:block"
        onMouseOver={onPillHover}
        onFocus={onPillFocus}
        onMouseLeave={() => setOpenMenu(null)}
        onClick={onPillClick}
      >
        <style>{`
          .luniva-liquid-nav{--n-pad:5px;--n-pad-x:8px;--n-pad-x-compact:8px;--n-height:36px;--n-font:10.5px;--n-icon-gap:4px;--n-gap:0px}
          @media (min-width:1280px){.luniva-liquid-nav{--n-pad:6px;--n-pad-x:12px;--n-height:40px;--n-font:12px;--n-icon-gap:6px;--n-gap:2px}}
        `}</style>
        <LiquidNavbar
          items={LIQUID_ITEMS}
          active={liquidIndex(navKey)}
          tone={dark ? "dark" : "light"}
          compact={false}
          ariaLabel="القائمة الرئيسية"
          className="luniva-liquid-nav"
        />

        <div
          data-nav-dropdown="catalog"
          className={`absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border p-2 shadow-lg transition duration-200 motion-reduce:transition-none ${dropdownState(openMenu === "catalog")}`}
          style={dropdownStyle(catalogActive)}
        >
          <span className="absolute inset-x-0 -top-2 h-2" aria-hidden="true" />
          <p className="px-3 py-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
            تصفّحي لونيفا في مكان واحد
          </p>
          {CATALOG_LINKS.slice(1).map(({ href, label, icon: Icon, section: key }) => (
            <Link
              key={key}
              href={href}
              aria-current={active === key ? "page" : undefined}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)] motion-reduce:transition-none"
              style={{ color: active === key ? "var(--brand-strong)" : "var(--muted)" }}
            >
              <Icon size={13} />{label}
            </Link>
          ))}
          <Link
            href={SHOES_LINK.href}
            aria-current={navKey === "shoes" ? "page" : undefined}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)] motion-reduce:transition-none"
            style={{ color: navKey === "shoes" ? "var(--brand-strong)" : "var(--muted)" }}
          >
            <Footprints size={13} />{SHOES_LINK.label}
          </Link>
        </div>

        <div
          data-nav-dropdown="support"
          className={`absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border p-2 shadow-lg transition duration-200 motion-reduce:transition-none ${dropdownState(openMenu === "support")}`}
          style={dropdownStyle(supportActive)}
        >
          <span className="absolute inset-x-0 -top-2 h-2" aria-hidden="true" />
          <p className="px-3 py-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
            معلومات تهمّك
          </p>
          {SUPPORT_LINKS.map(({ href, label, icon: Icon, section: key }) => (
            <Link
              key={key}
              href={href}
              aria-current={active === key ? "page" : undefined}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition hover:bg-[var(--brand-soft)] motion-reduce:transition-none"
              style={{ color: active === key ? "var(--brand-strong)" : "var(--muted)" }}
            >
              <Icon size={13} />{label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
        <HeaderSearch />
        <Link href={ctaHref} className="btn btn-primary hidden px-3 py-2 text-[11px] sm:inline-flex">
          <ArrowLeft size={13} />{ctaLabel}
        </Link>
        <span className="hidden sm:inline-flex"><ThemeToggle showLabel={false} /></span>
        <button
          type="button"
          onClick={() => {
            setCatalogOpen(isCatalogMenuActive(active));
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

      {mounted && drawerOpen && createPortal(
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

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
              data-lenis-prevent
              data-lenis-prevent-wheel
            >
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
                <DrawerLink link={SHOES_LINK} active={navKey === "shoes"} onNavigate={() => setDrawerOpen(false)} nested />
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
        </div>,
        document.body,
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
