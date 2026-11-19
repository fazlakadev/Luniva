"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, MoreHorizontal, Plus, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import InvoiceCta from "@/components/invoice-cta";
import ThemeToggle from "@/components/theme-toggle";
import WelcomeDialog from "@/components/welcome-dialog";
import {
  Component as AdminSidebar,
  adminNav as nav,
  adminQuickLinks as quickLinks,
} from "@/components/ui/gsap-fullscreen-menu";

const mobileNav = nav.filter(({ href }) =>
  ["/workspace", "/invoices", "/payments", "/customers", "/reports"].includes(href),
);

export default function AppShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Restore the persisted sidebar state once the client is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCollapsed(window.localStorage.getItem("luniva_sidebar") === "collapsed"); }, []);

  // A completed client navigation should always dismiss the mobile sidebar.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("luniva_sidebar", next ? "collapsed" : "expanded");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/workspace" && pathname.startsWith(href));

  const moreActive = ["/products", "/packages", "/settings", "/profits", "/suppliers", "/invoices/new", "/packages/new", "/products/new", "/customers/new"]
    .some((prefix) => pathname.startsWith(prefix));

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: "var(--bg)", color: "var(--ink)" }} dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-70 print:hidden"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, var(--brand-soft) 0, transparent 28%), radial-gradient(circle at 94% 100%, var(--lav-soft) 0, transparent 26%)",
        }}
      />

      {/* Supplied GSAP fullscreen menu, adapted into the admin sidebar */}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        open={drawerOpen}
        onClose={closeDrawer}
      />

      <main
        className={`page-enter relative min-h-screen w-full transition-[padding] duration-300 ${
          collapsed ? "xl:pr-[88px]" : "xl:pr-[286px]"
        }`}
      >
        <header
          className="hidden items-center justify-between gap-3 border-b px-6 py-3 xl:flex print:hidden"
          style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-2xl text-sm font-black text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-strong))" }}
            >
              ل
            </span>
            <div>
              <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>مساحة العمل · لونيفا</p>
              <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>مرحبًا بك في لوحة التحكم</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-brand">شركة ملابس نسائية مصرية</span>
            <span className="badge badge-success"><ShieldCheck size={11} />جلسة آمنة</span>
          </div>
        </header>

        <header
          className="z-20 flex items-center justify-between gap-3 border-b px-4 py-2.5 xl:hidden print:hidden"
          style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 90%, transparent)" }}
        >
          <Link href="/workspace" className="flex min-w-0 items-center gap-2">
            <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} className="h-9 w-9 shrink-0 object-contain" />
            <span className="hidden truncate text-xs font-extrabold min-[400px]:inline" style={{ color: "var(--ink)" }}>مساحة العمل</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="btn btn-soft shrink-0 px-2.5 py-2"
              aria-label="فتح القائمة الجانبية"
              title="القائمة الجانبية"
              aria-expanded={drawerOpen}
            >
              <Menu size={16} />
            </button>
            <InvoiceCta
              href="/invoices/new"
              label="فاتورة"
              variant="mini"
              ariaLabel="فاتورة جديدة"
              className="txn-cta--header"
            />
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="btn btn-soft px-2.5 py-2"
              aria-label="القائمة السريعة"
              title="القائمة السريعة"
            >
              <Plus size={16} />
            </button>
            <ThemeToggle />
            <button onClick={logout} title="تسجيل الخروج" aria-label="تسجيل الخروج" className="btn btn-outline px-2.5 py-2">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div key={pathname} className="page-enter mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 xl:pb-12 xl:pt-9">
          {children}
        </div>
      </main>

      <nav
        className="fixed inset-x-2 bottom-2 z-40 flex justify-around gap-0.5 rounded-2xl border p-1.5 shadow-xl backdrop-blur-xl sm:inset-x-3 sm:bottom-3 sm:gap-1 xl:hidden print:hidden"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 94%, transparent)" }}
      >
        {mobileNav.map(({ href, short, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[9px] font-extrabold transition sm:text-[10px]"
              style={active ? { background: "var(--brand-soft)", color: "var(--brand-strong)" } : { color: "var(--muted)" }}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={active ? { background: "var(--surface)" } : undefined}
              >
                <Icon size={17} />
              </span>
              <span className="w-full truncate text-center">{short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-label="المزيد من الأقسام"
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[9px] font-extrabold transition sm:text-[10px]"
          style={moreActive || moreOpen ? { background: "var(--brand-soft)", color: "var(--brand-strong)" } : { color: "var(--muted)" }}
        >
          <span
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={moreActive || moreOpen ? { background: "var(--surface)" } : undefined}
          >
            <MoreHorizontal size={17} />
          </span>
          <span className="w-full truncate text-center">المزيد</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 xl:hidden print:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة السريعة"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 cursor-default bg-[#1c101c]/45 backdrop-blur-sm"
          />
          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            className="absolute inset-x-2 bottom-[76px] max-h-[72dvh] overflow-y-auto overscroll-contain rounded-2xl border p-3 shadow-xl sm:inset-x-3 sm:bottom-[86px] sm:p-4"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="text-[12px] font-black" style={{ color: "var(--ink)" }}>قائمة سريعة</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="إغلاق"
                className="btn-icon"
                style={{ color: "var(--muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="px-1 text-[10px] font-black" style={{ color: "var(--brand-strong)" }}>أقسام إضافية</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {nav.filter(({ href }) => ["/products", "/packages", "/profits", "/suppliers", "/settings"].includes(href)).map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-w-0 items-center gap-2 rounded-xl border p-3 text-[11px] font-extrabold"
                    style={active ? { background: "var(--brand-soft)", borderColor: "var(--brand)", color: "var(--brand-strong)" } : { borderColor: "var(--line)", color: "var(--ink-soft)" }}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>

            <p className="mt-4 px-1 text-[10px] font-black" style={{ color: "var(--lav-strong)" }}>إجراءات سريعة</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-w-0 items-center gap-2 rounded-xl border p-3 text-[11px] font-extrabold"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <WelcomeDialog name={name} />
    </div>
  );
}
