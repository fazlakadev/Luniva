"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Sparkles, LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/format";

export default function FloatingCartBar() {
  const pathname = usePathname();
  const { count, total, mounted } = useCart();
  const [customer, setCustomer] = useState<{ fullName: string } | null>(null);

  useEffect(() => {
    fetch("/api/customer/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.customer) setCustomer(data.customer);
      })
      .catch(() => null);
  }, [pathname]);

  if (!mounted) return null;

  // Don't show floating bar if already on cart page or admin dashboard
  if (pathname === "/cart" || pathname?.startsWith("/workspace") || pathname?.startsWith("/invoices") || pathname?.startsWith("/orders")) {
    return null;
  }

  return (
    <aside
      aria-label="سلة الاستفسارات والطلبات السريعة"
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2 print-hidden"
    >
      {/* Customer Account Pill */}
      {customer ? (
        <div className="flex items-center gap-2 bg-[var(--surface)] text-ink border border-[var(--line)] shadow-xl rounded-full px-3 py-2 text-xs font-bold backdrop-blur-md">
          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-black text-[10px]">
            {customer.fullName[0]?.toUpperCase() || "L"}
          </span>
          <span className="truncate max-w-[100px]">{customer.fullName}</span>
        </div>
      ) : (
        <Link
          href={`/login?returnTo=${encodeURIComponent(pathname || "/catalog")}`}
          className="flex items-center gap-1.5 bg-[var(--surface)] text-ink hover:text-[var(--brand-strong)] border border-[var(--line)] shadow-xl rounded-full px-3.5 py-2 text-xs font-black backdrop-blur-md transition hover:-translate-y-0.5"
        >
          <User size={13} className="text-[var(--brand-strong)]" />
          <span>حسابي</span>
        </Link>
      )}

      {/* Cart Pill */}
      <Link
        href="/cart"
        className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-xs font-black shadow-2xl transition-all duration-300 active:scale-95 hover:-translate-y-1 ${
          count > 0
            ? "bg-[var(--brand-strong)] text-white shadow-[var(--brand)]/30 ring-2 ring-white/20"
            : "bg-[var(--surface)] text-ink border border-[var(--line)]"
        }`}
      >
        <div className="relative">
          <ShoppingBag size={17} />
          {count > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black grid place-items-center shadow-sm">
              {count}
            </span>
          )}
        </div>
        <span>{count > 0 ? "سلة الاستفسار" : "السلة"}</span>
        {count > 0 && (
          <span className="border-r border-white/30 pr-2 font-mono text-[11px]" dir="ltr">
            {formatMoney(total)}
          </span>
        )}
      </Link>
    </aside>
  );
}
