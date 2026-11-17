"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  Gift,
  LayoutGrid,
  LogOut,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/theme-toggle";

const nav = [
  { href: "/workspace", label: "مساحة العمل", short: "الرئيسية", hint: "لوحة البداية", icon: LayoutGrid },
  { href: "/invoices", label: "الفواتير", short: "الفواتير", hint: "بيع وتحصيل وطباعة", icon: ReceiptText },
  { href: "/payments", label: "سجل التحصيل", short: "التحصيل", hint: "الدفعات والإيصالات", icon: Wallet },
  { href: "/reports", label: "التقارير", short: "التقارير", hint: "تحليلات وأعمار متأخرات", icon: BarChart3 },
  { href: "/customers", label: "إدارة العملاء", short: "العملاء", hint: "دليل العميلات", icon: UsersRound },
  { href: "/products", label: "إدارة المنتجات", short: "المنتجات", hint: "الكتالوج والمتغيرات", icon: Package },
  { href: "/packages", label: "البكدجات", short: "البكدجات", hint: "عروض ومنتجات مجمعة", icon: Gift },
  { href: "/settings", label: "الإعدادات", short: "الإعدادات", hint: "بيانات الشركة والشروط", icon: Settings2 },
];

const mobileNav = nav.filter(({ href }) =>
  ["/workspace", "/invoices", "/payments", "/customers", "/reports"].includes(href),
);

const quickLinks = [
  { href: "/invoices/new", label: "فاتورة جديدة", hint: "بيع وتحصيل", icon: ReceiptText },
  { href: "/packages/new", label: "بكدج جديد", hint: "تجميع منتجات", icon: Gift },
  { href: "/products/new", label: "منتج جديد", hint: "إضافة للكتالوج", icon: Package },
  { href: "/customers/new", label: "عميلة جديدة", hint: "ملف عميلة", icon: UsersRound },
];

export default function AppShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Restore the persisted sidebar state once the client is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCollapsed(window.localStorage.getItem("luniva_sidebar") === "collapsed"); }, []);

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

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: "var(--bg)", color: "var(--ink)" }} dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-70 print:hidden"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, var(--brand-soft) 0, transparent 28%), radial-gradient(circle at 94% 100%, var(--lav-soft) 0, transparent 26%)",
        }}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-40 hidden border-l shadow-sm backdrop-blur-2xl transition-[width] duration-300 ease-out xl:flex xl:flex-col print:hidden ${
          collapsed ? "w-[88px]" : "w-[286px]"
        }`}
        style={{
          borderColor: "var(--line)",
          background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, transparent), color-mix(in srgb, var(--surface-2) 92%, transparent))",
        }}
      >
        <button
          onClick={toggleSidebar}
          className="absolute -left-3.5 top-24 z-10 grid h-8 w-8 place-items-center rounded-full shadow-md transition hover:scale-105 active:scale-95"
          style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--brand-strong)" }}
          aria-label={collapsed ? "فتح القائمة" : "طي القائمة"}
          title={collapsed ? "فتح القائمة" : "طي القائمة"}
        >
          {collapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
        </button>

        <div className={`flex h-full min-h-0 flex-col ${collapsed ? "gap-4 px-3 py-4" : "gap-5 px-4 py-5"}`}>
          {/* Logo */}
          <Link
            href="/workspace"
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
                  من تأسيس منه
                </span>
              </span>
            )}
          </Link>

          {/* Navigation */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className={`mb-2 flex items-center gap-2 ${collapsed ? "justify-center" : "px-1"}`}>
              {collapsed ? (
                <span className="h-px w-6" style={{ background: "var(--line-strong)" }} />
              ) : (
                <>
                  <span className="text-[10px] font-black tracking-[0.18em]" style={{ color: "var(--muted-2)" }}>التنقل</span>
                  <span className="h-px flex-1" style={{ background: "var(--line)" }} />
                </>
              )}
            </div>

            <nav className="space-y-1.5">
              {nav.map(({ href, label, hint, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 ${
                      collapsed ? "h-12 justify-center" : "gap-3 px-2.5 py-2.5"
                    } ${active ? "shadow-sm" : "hover:translate-x-[-2px]"}`}
                    style={
                      active
                        ? {
                            background: "linear-gradient(90deg, var(--brand-soft), color-mix(in srgb, var(--brand-soft) 35%, var(--surface)))",
                            color: "var(--brand-strong)",
                            border: "1px solid color-mix(in srgb, var(--brand) 22%, var(--line))",
                          }
                        : { color: "var(--ink-soft)", border: "1px solid transparent" }
                    }
                  >
                    {active && (
                      <span className="absolute inset-y-2.5 right-0 w-[3px] rounded-full" style={{ background: "var(--brand)" }} />
                    )}
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors"
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
                        <span className="min-w-0 flex-1">
                          <span className="block truncate leading-5">{label}</span>
                          <span className="mt-0.5 block truncate text-[10px] font-medium" style={{ color: active ? "var(--brand)" : "var(--muted-2)" }}>
                            {hint}
                          </span>
                        </span>
                        <ChevronLeft
                          size={14}
                          className={`shrink-0 transition-transform ${active ? "opacity-80" : "opacity-0 group-hover:opacity-60"}`}
                        />
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Quick add */}
            {collapsed ? (
              <div className="mt-4 space-y-1.5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                {quickLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
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
                <p className="flex items-center justify-between px-1.5 pb-2 text-[10px] font-black tracking-[0.14em]" style={{ color: "var(--muted-2)" }}>
                  <span className="flex items-center gap-1.5"><Plus size={12} />إضافة سريعة</span>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                </p>
                {quickLinks.map(({ href, label, hint, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[var(--surface)]"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition group-hover:scale-105"
                      style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold" style={{ color: "var(--ink-soft)" }}>{label}</span>
                      <span className="block truncate text-[9px]" style={{ color: "var(--muted-2)" }}>{hint}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 space-y-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <div className={`flex ${collapsed ? "justify-center" : "items-center justify-between gap-2"}`}>
              <ThemeToggle showLabel={false} />
              {!collapsed && (
                <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-extrabold" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
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
                {name.trim().charAt(0).toUpperCase() || "L"}
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold leading-5" style={{ color: "var(--ink)" }}>{name}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-2)" }}>مؤسّسة لونيفا</p>
                </div>
              )}
              {!collapsed && (
                <button
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
              {name.trim().charAt(0) || "م"}
            </span>
            <div>
              <p className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>مساحة العمل · لونيفا</p>
              <p className="text-sm font-extrabold" style={{ color: "var(--ink)" }}>أهلًا، {name} ✨</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-brand">أسّستها {name}</span>
            <span className="badge badge-success"><ShieldCheck size={11} />جلسة آمنة</span>
          </div>
        </header>

        <header
          className="z-20 flex items-center justify-between gap-3 border-b px-4 py-2.5 xl:hidden print:hidden"
          style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 90%, transparent)" }}
        >
          <Link href="/workspace" className="flex min-w-0 items-center gap-2">
            <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} className="h-9 w-9 shrink-0 object-contain" />
            <span className="truncate text-xs font-extrabold" style={{ color: "var(--ink)" }}>أهلًا، {name}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href="/invoices/new" className="btn btn-primary px-3 py-2 text-[11px]">
              <ReceiptText size={14} />فاتورة
            </Link>
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
        className="fixed inset-x-3 bottom-3 z-40 flex justify-around gap-1 rounded-2xl border p-1.5 shadow-xl backdrop-blur-xl xl:hidden print:hidden"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 94%, transparent)" }}
      >
        {mobileNav.map(({ href, short, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-extrabold transition"
              style={active ? { background: "var(--brand-soft)", color: "var(--brand-strong)" } : { color: "var(--muted)" }}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={active ? { background: "var(--surface)" } : undefined}
              >
                <Icon size={17} />
              </span>
              {short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
