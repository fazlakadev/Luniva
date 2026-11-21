"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronLeft,
  Gift,
  LayoutGrid,
  LogOut,
  Mail,
  MailCheck,
  MessageSquare,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import ThemeToggle from "@/components/theme-toggle";

// Register GSAP Plugins safely (client only).
if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

export type AdminNavItem = {
  href: string;
  label: string;
  short: string;
  hint: string;
  icon: LucideIcon;
};

export type AdminQuickLink = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

// The exact admin navigation that used to live in app-shell.
export const adminNav: AdminNavItem[] = [
  { href: "/workspace", label: "مساحة العمل", short: "الرئيسية", hint: "لوحة البداية", icon: LayoutGrid },
  { href: "/invoices", label: "الفواتير", short: "الفواتير", hint: "بيع وتحصيل وطباعة", icon: ReceiptText },
  { href: "/payments", label: "سجل التحصيل", short: "التحصيل", hint: "الدفعات والإيصالات", icon: Wallet },
  { href: "/appointments", label: "المواعيد والمتابعات", short: "المواعيد", hint: "متابعة وتحصيل وتسليم", icon: CalendarDays },
  { href: "/reports", label: "التقارير", short: "التقارير", hint: "تحليلات وأعمار متأخرات", icon: BarChart3 },
  { href: "/profits", label: "الأرباح", short: "الأرباح", hint: "سعر التوريد والربح والهامش", icon: TrendingUp },
  { href: "/customers", label: "إدارة العملاء", short: "العملاء", hint: "دليل العميلات", icon: UsersRound },
  { href: "/suppliers", label: "الموردون", short: "الموردون", hint: "أسعار التوريد والموردون", icon: Truck },
  { href: "/products", label: "إدارة المنتجات", short: "المنتجات", hint: "الكتالوج والمتغيرات", icon: Package },
  { href: "/inventory", label: "المخزون والتحليلات", short: "المخزون", hint: "تنبيهات ورصيد البكدجات", icon: Boxes },
  { href: "/packages", label: "البكدجات", short: "البكدجات", hint: "عروض ومنتجات مجمعة", icon: Gift },
  { href: "/orders", label: "طلبات الشراء", short: "الطلبات", hint: "استفسارات الحجز والشراء", icon: ShoppingBag },
  { href: "/messages", label: "رسائل التواصل", short: "الرسائل", hint: "استفسارات ودعم العميلات", icon: Mail },
  { href: "/whatsapp", label: "واتساب والمحادثات", short: "واتساب", hint: "محادثات مباشرة وربط QR", icon: MessageSquare },
  { href: "/newsletter", label: "النشرة البريدية", short: "النشرة", hint: "المشتركات وحملات البريد", icon: MailCheck },
  { href: "/settings", label: "الإعدادات", short: "الإعدادات", hint: "بيانات الشركة والشروط", icon: Settings2 },
];

export const adminQuickLinks: AdminQuickLink[] = [
  { href: "/appointments", label: "موعد متابعة", hint: "ربط بعميلة أو فاتورة", icon: CalendarDays },
  { href: "/invoices/new", label: "فاتورة جديدة", hint: "بيع وتحصيل", icon: ReceiptText },
  { href: "/packages/new", label: "بكدج جديد", hint: "تجميع منتجات", icon: Gift },
  { href: "/products/new", label: "منتج جديد", hint: "إضافة للكتالوج", icon: Package },
  { href: "/customers/new", label: "عميلة جديدة", hint: "ملف عميلة", icon: UsersRound },
];

type AdminSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  open: boolean;
  onClose: () => void;
};

export function Component({ collapsed: collapsedProp, onToggle, open, onClose }: AdminSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [isDesktop, setIsDesktop] = useState(false);
  // Collapse is a desktop-only preference; the mobile drawer always shows full labels.
  const collapsed = collapsedProp && isDesktop;

  // Track the desktop breakpoint: xl keeps the sidebar docked, smaller screens use the drawer.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Initial setup, custom easing and hover effects (scoped to this sidebar).
  useEffect(() => {
    if (!containerRef.current) return;

    const root = containerRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      if (!gsap.parseEase("main")) {
        CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
      }
      if (!reduced) gsap.defaults({ ease: "main", duration: 0.7 });
    } catch (e) {
      console.warn("CustomEase failed to load, falling back to default.", e);
      if (!reduced) gsap.defaults({ ease: "power2.out", duration: 0.7 });
    }

    const ctx = gsap.context(() => {
      const shapesContainer = root.querySelector(".ambient-background-shapes");
      const menuItems = root.querySelectorAll<HTMLElement>(".menu-list-item[data-shape]");
      const links = root.querySelectorAll<HTMLElement>(".nav-link");

      if (!reduced) {
        shapesContainer?.querySelectorAll(".shape-element").forEach((shapeEl) => {
          gsap.set(shapeEl, { scale: 0.8, opacity: 0, transformOrigin: "50% 50%" });
        });
      }

      menuItems.forEach((item) => {
        const shapeIndex = item.getAttribute("data-shape");
        const shape = shapesContainer ? shapesContainer.querySelector(`.bg-shape-${shapeIndex}`) : null;
        const shapeEls = shape?.querySelectorAll(".shape-element") ?? [];

        const onEnter = () => {
          if (reduced || !shape) return;
          shapesContainer?.querySelectorAll(".bg-shape").forEach((s) => s.classList.remove("active"));
          shape.classList.add("active");
          gsap.fromTo(
            shapeEls,
            { scale: 0.5, opacity: 0, rotation: -10 },
            { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)", overwrite: "auto" },
          );
        };

        const onLeave = () => {
          if (reduced || !shape) return;
          gsap.to(shapeEls, {
            scale: 0.8,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => shape.classList.remove("active"),
            overwrite: "auto",
          });
        };

        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);
        (item as HTMLElement & { _lunivaCleanup?: () => void })._lunivaCleanup = () => {
          item.removeEventListener("mouseenter", onEnter);
          item.removeEventListener("mouseleave", onLeave);
        };
      });

      // GSAP enhanced nav-link hover backgrounds (CSS fallback handles reduced motion).
      links.forEach((link) => {
        const hoverBg = link.querySelector(".nav-link-hover-bg");
        if (!hoverBg || reduced) return;

        const onEnter = () => {
          gsap.fromTo(
            hoverBg,
            { scaleX: 0, opacity: 0, transformOrigin: "right center" },
            { scaleX: 1, opacity: 1, duration: 0.35, ease: "power2.out", overwrite: "auto" },
          );
        };
        const onLeave = () => {
          gsap.to(hoverBg, {
            scaleX: 0,
            opacity: 0,
            duration: 0.25,
            ease: "power2.in",
            transformOrigin: "right center",
            overwrite: "auto",
          });
        };

        link.addEventListener("mouseenter", onEnter);
        link.addEventListener("mouseleave", onLeave);
        (link as HTMLElement & { _lunivaCleanup?: () => void })._lunivaCleanup = () => {
          link.removeEventListener("mouseenter", onEnter);
          link.removeEventListener("mouseleave", onLeave);
        };
      });
    }, containerRef);

    return () => {
      ctx.revert();
      root.querySelectorAll<HTMLElement>(".menu-list-item[data-shape], .nav-link").forEach((el) => {
        (el as HTMLElement & { _lunivaCleanup?: () => void })._lunivaCleanup?.();
      });
    };
  }, []);

  // Open / close timeline. Backdrop panels, staggered links and the button swap are kept from the supplied menu.
  const visible = isDesktop || open;
  const showOverlay = open && !isDesktop;

  useEffect(() => {
    if (!containerRef.current) return;

    const root = containerRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const navWrap = root.querySelector<HTMLElement>(".nav-overlay-wrapper");
      const menu = root.querySelector<HTMLElement>(".menu-content");
      const overlay = root.querySelector<HTMLElement>(".overlay");
      const bgPanels = root.querySelectorAll<HTMLElement>(".backdrop-layer");
      const menuLinks = root.querySelectorAll<HTMLElement>(".nav-link");
      const fadeTargets = root.querySelectorAll<HTMLElement>("[data-menu-fade]");
      const menuButton = root.querySelector<HTMLElement>(".nav-close-btn");
      const menuButtonTexts = Array.from(menuButton?.querySelectorAll("p") ?? []);
      const menuButtonIcon = menuButton?.querySelector(".menu-button-icon") ?? [];

      if (reduced) {
        // No motion: jump straight to the final state and never lock page scroll.
        if (visible) {
          navWrap?.setAttribute("data-nav", "open");
          gsap.set(navWrap, { display: "block" });
          gsap.set(menu, { xPercent: 0 });
          gsap.set(bgPanels, { xPercent: 0 });
          gsap.set(menuLinks, { yPercent: 0, rotate: 0 });
          gsap.set(fadeTargets, { autoAlpha: 1, yPercent: 0, clearProps: "opacity,visibility,transform" });
          gsap.set(menuButtonTexts, { yPercent: showOverlay ? -100 : 0 });
          gsap.set(menuButtonIcon, { rotate: showOverlay ? 315 : 0 });
          gsap.set(overlay, { autoAlpha: showOverlay ? 1 : 0 });
        } else {
          navWrap?.setAttribute("data-nav", "closed");
          gsap.set(overlay, { autoAlpha: 0 });
          gsap.set(menu, { xPercent: 120 });
          gsap.set(menuButtonTexts, { yPercent: 0 });
          gsap.set(menuButtonIcon, { rotate: 0 });
          gsap.set(navWrap, { display: "none" });
        }
        return;
      }

      const tl = gsap.timeline();

      if (visible) {
        navWrap?.setAttribute("data-nav", "open");

        tl.set(navWrap, { display: "block" })
          .set(menu, { xPercent: 0 }, "<")
          .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: showOverlay ? -100 : 0, stagger: 0.2 }, "<")
          .fromTo(menuButtonIcon, { rotate: 0 }, { rotate: showOverlay ? 315 : 0 }, "<")
          .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: showOverlay ? 1 : 0 }, "<")
          .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
          .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 }, "<+=0.35");

        if (fadeTargets.length) {
          tl.fromTo(
            fadeTargets,
            { autoAlpha: 0, yPercent: 50 },
            { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: "all" },
            "<+=0.2",
          );
        }
      } else {
        navWrap?.setAttribute("data-nav", "closed");

        tl.to(overlay, { autoAlpha: 0 })
          .to(menu, { xPercent: 120 }, "<")
          .to(menuButtonTexts, { yPercent: 0 }, "<")
          .to(menuButtonIcon, { rotate: 0 }, "<")
          .set(navWrap, { display: "none" });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [visible, showOverlay]);

  // Escape closes the mobile drawer (the quick menu in app-shell has its own handler).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onClose();
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/workspace" && pathname.startsWith(href));

  return (
    <div ref={containerRef} className="gsap-admin-menu">
      <div data-nav="closed" className="nav-overlay-wrapper fixed inset-0 z-50 xl:pointer-events-none print:hidden">
        <button
          type="button"
          aria-label="إغلاق القائمة الجانبية"
          onClick={onClose}
          className="overlay invisible absolute inset-0 cursor-default bg-[#1c101c]/45 opacity-0 backdrop-blur-sm xl:hidden"
        />

        <aside
          aria-label="القائمة الجانبية للإدارة"
          className={`menu-content fixed inset-y-0 right-0 z-10 flex w-[min(86vw,320px)] translate-x-full flex-col border-l shadow-2xl transition-[width] duration-300 ease-out xl:pointer-events-auto xl:translate-x-0 ${
            collapsed ? "xl:w-[88px]" : "xl:w-[286px]"
          }`}
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          {/* Animated backdrop layers + ambient hover shapes from the supplied GSAP menu */}
          <div className="menu-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className="backdrop-layer first absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--surface) 97%, transparent), color-mix(in srgb, var(--surface-2) 92%, transparent))",
              }}
            />
            <div
              className="backdrop-layer second absolute inset-0"
              style={{ background: "radial-gradient(circle at 100% 0%, var(--brand-soft) 0, transparent 62%)" }}
            />
            <div
              className="backdrop-layer absolute inset-0"
              style={{ background: "radial-gradient(circle at 0% 100%, var(--lav-soft) 0, transparent 58%)" }}
            />

            <div className="ambient-background-shapes absolute inset-0">
              <svg className="bg-shape bg-shape-1 absolute h-full w-full" viewBox="0 0 400 400" fill="none" preserveAspectRatio="none">
                <circle className="shape-element" cx="80" cy="120" r="40" fill="rgba(169,93,115,0.16)" />
                <circle className="shape-element" cx="300" cy="80" r="60" fill="rgba(92,73,143,0.13)" />
                <circle className="shape-element" cx="200" cy="300" r="80" fill="rgba(236,72,153,0.10)" />
                <circle className="shape-element" cx="350" cy="280" r="30" fill="rgba(169,93,115,0.16)" />
              </svg>
              <svg className="bg-shape bg-shape-2 absolute h-full w-full" viewBox="0 0 400 400" fill="none" preserveAspectRatio="none">
                <path className="shape-element" d="M0 200 Q100 100, 200 200 T 400 200" stroke="rgba(169,93,115,0.20)" strokeWidth="60" fill="none" />
                <path className="shape-element" d="M0 280 Q100 180, 200 280 T 400 280" stroke="rgba(92,73,143,0.16)" strokeWidth="40" fill="none" />
              </svg>
              <svg className="bg-shape bg-shape-3 absolute h-full w-full" viewBox="0 0 400 400" fill="none" preserveAspectRatio="none">
                <circle className="shape-element" cx="50" cy="50" r="8" fill="rgba(169,93,115,0.30)" />
                <circle className="shape-element" cx="150" cy="50" r="8" fill="rgba(92,73,143,0.30)" />
                <circle className="shape-element" cx="250" cy="50" r="8" fill="rgba(236,72,153,0.30)" />
                <circle className="shape-element" cx="350" cy="50" r="8" fill="rgba(169,93,115,0.30)" />
                <circle className="shape-element" cx="100" cy="150" r="12" fill="rgba(92,73,143,0.25)" />
                <circle className="shape-element" cx="200" cy="150" r="12" fill="rgba(236,72,153,0.25)" />
                <circle className="shape-element" cx="300" cy="150" r="12" fill="rgba(169,93,115,0.25)" />
                <circle className="shape-element" cx="50" cy="250" r="10" fill="rgba(236,72,153,0.30)" />
                <circle className="shape-element" cx="150" cy="250" r="10" fill="rgba(169,93,115,0.30)" />
                <circle className="shape-element" cx="250" cy="250" r="10" fill="rgba(92,73,143,0.30)" />
                <circle className="shape-element" cx="350" cy="250" r="10" fill="rgba(169,93,115,0.30)" />
                <circle className="shape-element" cx="100" cy="350" r="6" fill="rgba(92,73,143,0.30)" />
                <circle className="shape-element" cx="200" cy="350" r="6" fill="rgba(236,72,153,0.30)" />
                <circle className="shape-element" cx="300" cy="350" r="6" fill="rgba(169,93,115,0.30)" />
              </svg>
              <svg className="bg-shape bg-shape-4 absolute h-full w-full" viewBox="0 0 400 400" fill="none" preserveAspectRatio="none">
                <path
                  className="shape-element"
                  d="M100 100 Q150 50, 200 100 Q250 150, 200 200 Q150 250, 100 200 Q50 150, 100 100"
                  fill="rgba(169,93,115,0.12)"
                />
                <path
                  className="shape-element"
                  d="M250 200 Q300 150, 350 200 Q400 250, 350 300 Q400 250, 350 300 Q300 350, 250 300 Q200 250, 250 200"
                  fill="rgba(236,72,153,0.10)"
                />
              </svg>
              <svg className="bg-shape bg-shape-5 absolute h-full w-full" viewBox="0 0 400 400" fill="none" preserveAspectRatio="none">
                <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke="rgba(169,93,115,0.15)" strokeWidth="30" />
                <line className="shape-element" x1="100" y1="0" x2="400" y2="300" stroke="rgba(92,73,143,0.12)" strokeWidth="25" />
                <line className="shape-element" x1="200" y1="0" x2="400" y2="200" stroke="rgba(236,72,153,0.10)" strokeWidth="20" />
              </svg>
            </div>
          </div>

          {/* Menu / close button with the GSAP text + icon swap (mobile drawer) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="nav-close-btn absolute left-3 top-3 z-20 flex items-center gap-2 rounded-xl px-2.5 py-2 xl:hidden"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--brand-strong)" }}
          >
            <div className="menu-button-text relative h-5 w-14 overflow-hidden text-right" style={{ lineHeight: "20px" }}>
              <p className="p-large" style={{ height: 20, lineHeight: "20px" }}>القائمة</p>
              <p className="p-large" style={{ height: 20, lineHeight: "20px" }}>إغلاق</p>
            </div>
            <span className="icon-wrap grid h-6 w-6 place-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 16" fill="none" className="menu-button-icon">
                <path d="M7.33333 16L7.33333 -3.2055e-07L8.66667 -3.78832e-07L8.66667 16L7.33333 16Z" fill="currentColor" />
                <path d="M16 8.66667L-2.62269e-07 8.66667L-3.78832e-07 7.33333L16 7.33333L16 8.66667Z" fill="currentColor" />
                <path d="M6 7.33333L7.33333 7.33333L7.33333 6C7.33333 6.73637 6.73638 7.33333 6 7.33333Z" fill="currentColor" />
                <path d="M10 7.33333L8.66667 7.33333L8.66667 6C8.66667 6.73638 9.26362 7.33333 10 7.33333Z" fill="currentColor" />
                <path d="M6 8.66667L7.33333 8.66667L7.33333 10C7.33333 9.26362 6.73638 8.66667 6 8.66667Z" fill="currentColor" />
                <path d="M10 8.66667L8.66667 8.66667L8.66667 10C8.66667 9.26362 9.26362 8.66667 10 8.66667Z" fill="currentColor" />
              </svg>
            </span>
          </button>

          {/* Desktop collapse / expand control */}
          <button
            type="button"
            onClick={onToggle}
            className="absolute -left-3.5 top-24 z-20 hidden h-8 w-8 place-items-center rounded-full shadow-md transition hover:scale-105 active:scale-95 xl:grid"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--brand-strong)" }}
            aria-label={collapsed ? "فتح القائمة" : "طي القائمة"}
            title={collapsed ? "فتح القائمة" : "طي القائمة"}
          >
            {collapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
          </button>

          <div className={`relative flex h-full min-h-0 flex-col ${collapsed ? "gap-4 px-3 py-4" : "gap-5 px-4 py-5"}`}>
            {/* Logo */}
            <Link
              href="/workspace"
              onClick={onClose}
              title="شعار لونيفا"
              className={`relative flex shrink-0 items-center overflow-hidden rounded-2xl transition hover:brightness-[1.02] ${
                collapsed ? "h-14 justify-center" : "gap-3 px-3 py-3"
              }`}
              style={{
                background: "linear-gradient(135deg, var(--brand-soft), var(--surface))",
                border: "1px solid var(--line)",
              }}
            >
              <span
                className="pointer-events-none absolute -left-8 -top-10 h-20 w-20 rounded-full opacity-60 blur-2xl"
                style={{ background: "var(--lav-soft)" }}
              />
              <Image
                src="/luniva-logo-v2.png"
                alt="شعار لونيفا"
                width={128}
                height={128}
                priority
                className={`relative shrink-0 object-contain transition-all duration-300 ${collapsed ? "h-9 w-9" : "h-10 w-10"}`}
              />
              {!collapsed && (
                <span className="relative min-w-0 leading-tight">
                  <span className="block text-[13px] font-black tracking-[0.12em]" style={{ color: "var(--ink)" }}>
                    لونيفا
                  </span>
                  <span className="mt-1 block whitespace-nowrap text-[8px] font-extrabold" style={{ color: "var(--brand-strong)" }}>
                    تأسست عام 2026
                  </span>
                </span>
              )}
            </Link>

            {/* Navigation — its own scroll container, so page scroll is never trapped */}
            <div
              data-lenis-prevent
              data-lenis-prevent-wheel
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            >
              <div className={`mb-2 flex items-center gap-2 ${collapsed ? "justify-center" : "px-1"}`}>
                {collapsed ? (
                  <span className="h-px w-6" style={{ background: "var(--line-strong)" }} />
                ) : (
                  <>
                    <span className="text-[10px] font-black tracking-[0.18em]" style={{ color: "var(--muted-2)" }}>
                      التنقل
                    </span>
                    <span className="h-px flex-1" style={{ background: "var(--line)" }} />
                  </>
                )}
              </div>

              <nav className="menu-list space-y-1.5">
                {adminNav.map(({ href, label, hint, icon: Icon }, index) => {
                  const active = isActive(href);
                  return (
                    <div key={href} className="menu-list-item" data-shape={(index % 5) + 1}>
                      <Link
                        href={href}
                        onClick={onClose}
                        title={collapsed ? label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`nav-link group relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 ${
                          collapsed ? "h-12 justify-center" : "gap-3 px-2.5 py-2.5"
                        } ${active ? "shadow-sm" : "hover:translate-x-[-2px]"}`}
                        style={
                          active
                            ? {
                                background:
                                  "linear-gradient(90deg, var(--brand-soft), color-mix(in srgb, var(--brand-soft) 35%, var(--surface)))",
                                color: "var(--brand-strong)",
                                border: "1px solid color-mix(in srgb, var(--brand) 22%, var(--line))",
                              }
                            : { color: "var(--ink-soft)", border: "1px solid transparent" }
                        }
                      >
                        <div
                          className="nav-link-hover-bg pointer-events-none absolute inset-0 rounded-xl opacity-0 motion-reduce:group-hover:opacity-100"
                          style={{ background: "var(--brand-soft)", transformOrigin: "right center" }}
                        />
                        {active && (
                          <span
                            className="absolute inset-y-2.5 right-0 z-10 w-[3px] rounded-full"
                            style={{ background: "var(--brand)" }}
                          />
                        )}
                        <span
                          className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors"
                          style={
                            active
                              ? { background: "var(--surface)", color: "var(--brand-strong)", boxShadow: "var(--shadow-sm)" }
                              : { background: "var(--surface-2)", color: "var(--muted)" }
                          }
                        >
                          <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="relative z-10 min-w-0 flex-1">
                              <span className="nav-link-text block truncate leading-5">{label}</span>
                              <span
                                data-menu-fade
                                className="mt-0.5 block truncate text-[10px] font-medium"
                                style={{ color: active ? "var(--brand)" : "var(--muted-2)" }}
                              >
                                {hint}
                              </span>
                            </span>
                            <ChevronLeft
                              size={14}
                              className={`relative z-10 shrink-0 transition-transform ${
                                active ? "opacity-80" : "opacity-0 group-hover:opacity-60"
                              }`}
                            />
                          </>
                        )}
                      </Link>
                    </div>
                  );
                })}
              </nav>

              {/* Quick add */}
              {collapsed ? (
                <div className="mt-4 space-y-1.5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                  {adminQuickLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      title={label}
                      className="grid h-11 place-items-center rounded-xl transition hover:bg-[var(--surface-3)]"
                      style={{ color: "var(--brand-strong)" }}
                    >
                      <Icon size={18} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl p-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <p
                    className="flex items-center justify-between px-1.5 pb-2 text-[10px] font-black tracking-[0.14em]"
                    style={{ color: "var(--muted-2)" }}
                  >
                    <span className="flex items-center gap-1.5"><Plus size={12} />إضافة سريعة</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                  </p>
                  {adminQuickLinks.map(({ href, label, hint, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[var(--surface)]"
                    >
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition group-hover:scale-105"
                        style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold" style={{ color: "var(--ink-soft)" }}>
                          {label}
                        </span>
                        <span className="block truncate text-[9px]" style={{ color: "var(--muted-2)" }}>
                          {hint}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer: theme toggle, secure session, profile and logout */}
            <div className="shrink-0 space-y-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
              <div className={`flex ${collapsed ? "justify-center" : "items-center justify-between gap-2"}`}>
                <ThemeToggle showLabel={false} />
                {!collapsed && (
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-extrabold"
                    style={{ background: "var(--success-soft)", color: "var(--success)" }}
                  >
                    <ShieldCheck size={11} />جلسة آمنة
                  </span>
                )}
              </div>

              <div
                className={`flex items-center rounded-2xl ${collapsed ? "justify-center p-2" : "gap-3 p-2.5"}`}
                style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-strong))" }}
                >
                  ل
                </span>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold leading-5" style={{ color: "var(--ink)" }}>
                      مساحة الإدارة
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--muted-2)" }}>
                      لونيفا · تأسست عام 2026
                    </p>
                  </div>
                )}
                {!collapsed && (
                  <button
                    type="button"
                    onClick={logout}
                    title="تسجيل الخروج"
                    aria-label="تسجيل الخروج"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    style={{ color: "var(--muted)" }}
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>

              {collapsed && (
                <button
                  type="button"
                  onClick={logout}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="grid h-10 w-full place-items-center rounded-xl transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                  style={{ color: "var(--muted)", border: "1px solid var(--line)" }}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Component;
