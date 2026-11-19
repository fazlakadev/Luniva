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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  description?: string;
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
const ABOUT_LINK: NavLink = {
  href: "/about",
  label: "من نحن",
  description: "حكاية لونيفا وقيمنا",
  icon: Sparkles,
  section: "about",
};
const PRODUCTS_LINK: NavLink = {
  href: "/catalog/products",
  label: "المنتجات",
  description: "كل القطع بالألوان والمقاسات",
  icon: Package,
  section: "products",
};
const PACKAGES_LINK: NavLink = {
  href: "/catalog/packages",
  label: "البكدجات",
  description: "تجميعات مختارة بخصم",
  icon: Gift,
  section: "packages",
};
const SHOES_LINK: NavLink = {
  href: "/shoes",
  label: "الأحذية",
  description: "تشكيلة أحذية لونيفا",
  icon: Footprints,
  section: "products",
};
const CONTACT_LINK: NavLink = {
  href: "/contact",
  label: "تواصل معنا",
  description: "نحن هنا لمساعدتك",
  icon: Mail,
  section: "contact",
};

const CATALOG_LINKS: NavLink[] = [HOME_LINK, PRODUCTS_LINK, PACKAGES_LINK];

const SUPPORT_LINKS: NavLink[] = [
  {
    href: "/faq",
    label: "الأسئلة الشائعة",
    description: "إجابات سريعة قبل الطلب",
    icon: CircleHelp,
    section: "faq",
  },
  {
    href: "/privacy",
    label: "سياسة الخصوصية",
    description: "كيف نحفظ بياناتك",
    icon: ShieldCheck,
    section: "privacy",
  },
  {
    href: "/terms",
    label: "الشروط والأحكام",
    description: "قواعد الاستخدام والطلب",
    icon: FileText,
    section: "terms",
  },
];

const CATALOG_LABEL = "الكتالوج";
const SUPPORT_LABEL = "المساعدة";

/** Panel geometry: keep these in sync with the panel style below. */
const MENU_WIDTH = 288;
const MENU_VIEWPORT_MARGIN = 12;

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

export default function PublicNav({ section, contactEmail = "", phone = "" }: PublicNavProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const navKey = resolveNavKey(pathname, section);
  const active = resolveActive(pathname, section);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<DropdownKey | null>(null);
  const [anchor, setAnchor] = useState<{ right: number; caret: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  const navWrapRef = useRef<HTMLDivElement>(null);
  const openMenuRef = useRef<DropdownKey | null>(null);
  const openSourceRef = useRef<"hover" | "click" | null>(null);
  const suppressFocusOpen = useRef(false);
  const pendingFocusRef = useRef<"first" | "last" | null>(null);
  const closeTimer = useRef<number | null>(null);

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

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  /**
   * Aligns the panel under its own trigger pill (right edges in RTL) and keeps
   * it inside the viewport. Both dropdowns used to share the nav's right edge,
   * which put them under the wrong pill and on top of each other.
   */
  const measureAnchor = useCallback((key: DropdownKey) => {
    const wrap = navWrapRef.current;
    const pill = wrap?.querySelector<HTMLElement>(`[data-menu-id="${key}"]`);
    if (!wrap || !pill) return;

    const wrapRect = wrap.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();

    // Distance from the wrapper's right edge to the pill's right edge.
    let right = wrapRect.right - pillRect.right;

    // Never let the panel spill past the viewport edges.
    const viewportRight = wrapRect.right - right;
    if (viewportRight > window.innerWidth - MENU_VIEWPORT_MARGIN) {
      right = wrapRect.right - (window.innerWidth - MENU_VIEWPORT_MARGIN);
    }
    const viewportLeft = wrapRect.right - right - MENU_WIDTH;
    if (viewportLeft < MENU_VIEWPORT_MARGIN) {
      right = wrapRect.right - MENU_VIEWPORT_MARGIN - MENU_WIDTH;
    }

    // The caret tracks the pill's centre, clamped inside the panel.
    const panelLeft = wrapRect.right - right - MENU_WIDTH;
    const caret = pillRect.left + pillRect.width / 2 - panelLeft;
    setAnchor({
      right: Math.round(right),
      caret: Math.round(Math.min(MENU_WIDTH - 20, Math.max(20, caret))),
    });
  }, []);

  const openDropdown = useCallback(
    (key: DropdownKey, source: "hover" | "click") => {
      cancelClose();
      measureAnchor(key);
      openMenuRef.current = key;
      openSourceRef.current = source;
      setOpenMenu(key);
    },
    [cancelClose, measureAnchor],
  );

  const closeDropdown = useCallback(
    (restoreFocus = false) => {
      cancelClose();
      const key = openMenuRef.current;
      openMenuRef.current = null;
      openSourceRef.current = null;
      setOpenMenu(null);
      setAnchor(null);
      if (restoreFocus && key) {
        // Returning focus to the trigger must not immediately re-open the menu,
        // and must happen after React hides the panel (otherwise the browser
        // drops focus to <body> when the focused link becomes invisible).
        suppressFocusOpen.current = true;
        window.requestAnimationFrame(() => {
          navWrapRef.current
            ?.querySelector<HTMLElement>(`[data-menu-id="${key}"]`)
            ?.focus();
          window.setTimeout(() => { suppressFocusOpen.current = false; }, 0);
        });
      }
    },
    [cancelClose],
  );

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      openMenuRef.current = null;
      openSourceRef.current = null;
      setOpenMenu(null);
      setAnchor(null);
    }, 150);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (event: globalThis.MouseEvent) => {
      if (navWrapRef.current && !navWrapRef.current.contains(event.target as Node)) {
        closeDropdown(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDropdown(true);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu, closeDropdown]);

  // Keep the panel glued to its pill when the viewport changes.
  useEffect(() => {
    if (!openMenu) return;
    const reposition = () => measureAnchor(openMenu);
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [openMenu, measureAnchor]);

  // A route change always dismisses the menu.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeDropdown(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Move focus into a panel opened with the keyboard, after it is visible.
  useEffect(() => {
    if (!openMenu || !pendingFocusRef.current) return;
    const direction = pendingFocusRef.current;
    pendingFocusRef.current = null;
    const items = Array.from(
      navWrapRef.current?.querySelectorAll<HTMLElement>(
        `#nav-menu-${openMenu} [role="menuitem"]`,
      ) ?? [],
    );
    items[direction === "first" ? 0 : items.length - 1]?.focus();
  }, [openMenu]);

  const catalogActive = isCatalogMenuActive(active) && navKey !== "shoes";
  const supportActive = isSupportSection(active);
  const ctaHref = active === "contact" ? "/catalog/products" : "/contact";
  const ctaLabel = active === "contact" ? "تصفّح المنتجات" : "تواصل معنا";

  const triggerKey = (target: EventTarget | null): DropdownKey | null => {
    const element = target as HTMLElement | null;
    const trigger = element?.closest?.<HTMLElement>("[data-menu-id]");
    const key = trigger?.getAttribute("data-menu-id");
    return key === "catalog" || key === "support" ? key : null;
  };

  const onNavPointerOver = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    const target = event.target as HTMLElement;
    // Travelling inside the open panel must never switch or close the menu.
    if (target.closest("[data-nav-dropdown]")) return;
    const key = triggerKey(target);
    if (!key) return;
    if (openMenuRef.current !== key) openDropdown(key, "hover");
  };

  const onNavPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    scheduleClose();
  };

  const onNavFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-nav-dropdown]")) {
      cancelClose();
      return;
    }
    if (suppressFocusOpen.current) return;
    const key = triggerKey(target);
    if (!key) {
      if (openMenuRef.current) closeDropdown(false);
      return;
    }
    if (openMenuRef.current !== key) openDropdown(key, "hover");
  };

  const onNavBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && navWrapRef.current?.contains(next)) return;
    closeDropdown(false);
  };

  const onNavClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // The supplied nav renders plain anchors; keep Next.js client navigation.
    const anchorEl = target.closest<HTMLAnchorElement>("a.nimbus-item[href]");
    if (
      anchorEl &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.button === 0
    ) {
      const href = anchorEl.getAttribute("href");
      if (href?.startsWith("/")) {
        event.preventDefault();
        closeDropdown(false);
        router.push(href);
        return;
      }
    }

    // Clicks inside a panel belong to its links, not to the trigger.
    if (target.closest("[data-nav-dropdown]")) return;

    const key = triggerKey(target);
    if (!key) return;

    // Hover may have opened it already; the first click keeps it open and
    // hands control to the click so a second click closes it.
    if (openMenuRef.current === key && openSourceRef.current === "click") {
      closeDropdown(false);
    } else {
      openDropdown(key, "click");
    }
  };

  const panelItems = (key: DropdownKey) =>
    Array.from(
      navWrapRef.current?.querySelectorAll<HTMLElement>(
        `#nav-menu-${key} [role="menuitem"]`,
      ) ?? [],
    );

  const onNavKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const inPanel = Boolean(target.closest("[data-nav-dropdown]"));
    const key = openMenuRef.current;

    // Arrow keys on a closed trigger open the panel and jump into it.
    if (!key) {
      const trigger = triggerKey(target);
      if (trigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        pendingFocusRef.current = event.key === "ArrowDown" ? "first" : "last";
        openDropdown(trigger, "click");
      }
      return;
    }

    const items = panelItems(key);
    if (!items.length) return;

    if (inPanel) {
      const index = items.indexOf(target);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (event.key === "Tab") {
        scheduleClose();
      }
      return;
    }

    if (triggerKey(target) === key && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      items[event.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
    }
  };

  const liquidItems = useMemo<LiquidNavItem[]>(
    () => [
      { label: "الرئيسية", href: "/", icon: NimbusIcons.home, fx: "glow" },
      {
        label: CATALOG_LABEL,
        icon: NimbusIcons.globe,
        fx: "spin",
        menuId: "catalog",
        menuExpanded: openMenu === "catalog",
      },
      { label: "من نحن", href: "/about", icon: <Sparkles size={16} />, fx: "pop" },
      { label: "الأحذية", href: "/shoes", icon: <Footprints size={16} />, fx: "wave" },
      {
        label: SUPPORT_LABEL,
        icon: <CircleHelp size={16} />,
        fx: "drop",
        menuId: "support",
        menuExpanded: openMenu === "support",
      },
      { label: "تواصل", href: "/contact", icon: <Mail size={16} />, fx: "pop" },
    ],
    [openMenu],
  );

  return (
    <>
      <div
        ref={navWrapRef}
        className="relative hidden min-w-0 shrink items-center lg:block"
        onPointerOver={onNavPointerOver}
        onPointerLeave={onNavPointerLeave}
        onFocus={onNavFocus}
        onBlur={onNavBlur}
        onClick={onNavClick}
        onKeyDown={onNavKeyDown}
      >
        <style>{`
          .luniva-liquid-nav{--n-pad:5px;--n-pad-x:8px;--n-pad-x-compact:8px;--n-height:36px;--n-font:10.5px;--n-icon-gap:4px;--n-gap:0px}
          @media (min-width:1280px){.luniva-liquid-nav{--n-pad:6px;--n-pad-x:12px;--n-height:40px;--n-font:12px;--n-icon-gap:6px;--n-gap:2px}}
        `}</style>
        <LiquidNavbar
          items={liquidItems}
          active={liquidIndex(navKey)}
          tone={dark ? "dark" : "light"}
          compact={false}
          ariaLabel="القائمة الرئيسية"
          className="luniva-liquid-nav"
        />

        <NavDropdown
          id="catalog"
          open={openMenu === "catalog"}
          anchor={anchor}
          label="قائمة الكتالوج"
          eyebrow="تصفّحي لونيفا في مكان واحد"
          entries={[PRODUCTS_LINK, PACKAGES_LINK, SHOES_LINK]}
          active={catalogActive}
          isActive={(entry) => {
            if (entry.href === SHOES_LINK.href) return navKey === "shoes";
            if (navKey === "shoes") return false;
            return active === entry.section;
          }}
          onSelect={() => closeDropdown(false)}
          footer={{ href: "/catalog/products", label: "تصفّحي كل المنتجات" }}
        />

        <NavDropdown
          id="support"
          open={openMenu === "support"}
          anchor={anchor}
          label="قائمة المساعدة"
          eyebrow="معلومات تهمّك"
          entries={SUPPORT_LINKS}
          active={supportActive}
          isActive={(entry) => active === entry.section}
          onSelect={() => closeDropdown(false)}
          footer={{ href: "/contact", label: "تواصلي معنا مباشرة" }}
        />
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
                  <DrawerLink
                    key={link.section}
                    link={link}
                    active={active === link.section && navKey !== "shoes"}
                    onNavigate={() => setDrawerOpen(false)}
                    nested
                  />
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

function NavDropdown({
  id,
  open,
  anchor,
  label,
  eyebrow,
  entries,
  active,
  isActive,
  onSelect,
  footer,
}: {
  id: DropdownKey;
  open: boolean;
  anchor: { right: number; caret: number } | null;
  label: string;
  eyebrow: string;
  entries: NavLink[];
  active: boolean;
  isActive: (entry: NavLink) => boolean;
  onSelect: () => void;
  footer: { href: string; label: string };
}) {
  return (
    <div
      id={`nav-menu-${id}`}
      data-nav-dropdown={id}
      role="menu"
      aria-label={label}
      aria-hidden={!open}
      className={`absolute top-full z-50 mt-2 origin-top rounded-2xl border p-2 shadow-xl transition duration-200 ease-out motion-reduce:transition-none ${
        open
          ? "visible translate-y-0 scale-100 opacity-100"
          : "pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0"
      }`}
      style={{ width: MENU_WIDTH, right: anchor?.right ?? 0, ...dropdownStyle(active) }}
    >
      {anchor && (
        <span
          aria-hidden="true"
          className="absolute -top-[5px] h-2.5 w-2.5 rotate-45 rounded-[2px] border-l border-t"
          style={{ left: anchor.caret - 5, borderColor: "var(--line)", background: "var(--surface)" }}
        />
      )}
      {/* invisible bridge across the gap so the pointer can travel to the panel */}
      <span aria-hidden="true" className="absolute inset-x-0 -top-2 h-2" />

      <p className="px-3 pb-1.5 pt-2 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>
        {eyebrow}
      </p>

      <div className="space-y-0.5">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const current = isActive(entry);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              role="menuitem"
              onClick={onSelect}
              aria-current={current ? "page" : undefined}
              className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-[var(--brand-soft)] focus-visible:bg-[var(--brand-soft)] focus-visible:outline-none motion-reduce:transition-none"
              style={{ color: current ? "var(--brand-strong)" : "var(--ink-soft)" }}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{
                  background: current ? "var(--brand-soft)" : "var(--surface-2)",
                  color: current ? "var(--brand-strong)" : "var(--muted)",
                }}
              >
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
                  {entry.label}
                  {current && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand)" }} />
                  )}
                </span>
                {entry.description && (
                  <span className="mt-0.5 block truncate text-[10px] font-semibold" style={{ color: "var(--muted-2)" }}>
                    {entry.description}
                  </span>
                )}
              </span>
              <ArrowLeft
                size={12}
                className="shrink-0 opacity-0 transition group-hover:opacity-60 group-focus-visible:opacity-60 motion-reduce:transition-none"
              />
            </Link>
          );
        })}
      </div>

      <div className="mt-1.5 border-t pt-1.5" style={{ borderColor: "var(--line)" }}>
        <Link
          href={footer.href}
          role="menuitem"
          onClick={onSelect}
          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[10.5px] font-extrabold transition hover:bg-[var(--brand-soft)] focus-visible:bg-[var(--brand-soft)] focus-visible:outline-none motion-reduce:transition-none"
          style={{ color: "var(--brand-strong)" }}
        >
          {footer.label}
          <ArrowLeft size={12} />
        </Link>
      </div>
    </div>
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
      <span className="min-w-0 flex-1">
        <span className="block truncate">{link.label}</span>
        {link.description && (
          <span className="mt-0.5 block truncate text-[10px] font-semibold" style={{ color: "var(--muted-2)" }}>
            {link.description}
          </span>
        )}
      </span>
      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--brand)" }} />}
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
