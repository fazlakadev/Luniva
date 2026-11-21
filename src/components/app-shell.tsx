"use client";

import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminFloatingMenu from "@/components/ui/admin-floating-menu";
import WelcomeDialog from "@/components/welcome-dialog";
import NotificationCenter from "@/components/notification-center";
import {
  Component as AdminSidebar,
} from "@/components/ui/gsap-fullscreen-menu";

export default function AppShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Restore the persisted sidebar state once the client is available.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCollapsed(window.localStorage.getItem("luniva_sidebar") === "collapsed"); }, []);

  // A completed client navigation should always dismiss the mobile sidebar.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

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

  return (
    <div className="min-h-screen overflow-x-clip" style={{ background: "var(--bg)", color: "var(--ink)" }} dir="rtl">
      <div
        className="pointer-events-none fixed inset-0 opacity-70 print:hidden"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, var(--brand-soft) 0, transparent 28%), radial-gradient(circle at 94% 100%, var(--lav-soft) 0, transparent 26%)",
        }}
      />

      {/* Supplied GSAP fullscreen menu, adapted into the admin sidebar for desktop */}
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
        {/* Mobile Top Bar with Notification Center */}
        <header
          className="flex items-center justify-between border-b px-4 py-2.5 xl:hidden print:hidden"
          style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 92%, transparent)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-xl text-xs font-black text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-strong))" }}
            >
              ل
            </span>
            <div>
              <p className="text-[9px] font-bold" style={{ color: "var(--muted-2)" }}>لونيفا</p>
              <p className="text-xs font-black text-ink">لوحة الإدارة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </header>

        {/* Desktop Header */}
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
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <span className="badge badge-brand">شركة ملابس نسائية مصرية</span>
            <span className="badge badge-success"><ShieldCheck size={11} />جلسة آمنة</span>
          </div>
        </header>

        {/* Admin Page Content */}
        <div key={pathname} className="page-enter mx-auto w-full max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 xl:pb-12 xl:pt-9">
          {children}
        </div>
      </main>

      {/* Mobile Developed Purple Floating Menu (replaces old mobile top and bottom navbars) */}
      <AdminFloatingMenu
        onLogout={logout}
        onOpenSidebar={() => setDrawerOpen(true)}
      />

      <WelcomeDialog name={name} />
    </div>
  );
}
