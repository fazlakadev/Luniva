"use client";

import Link from "next/link";
import { ArrowLeft, Phone, Plus, Search, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatMoney, formatNumber, initials } from "@/lib/format";

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  customer_code?: string | null;
  address?: string | null;
  image_url: string | null;
  created_at: string;
  phone_count?: number | null;
  balance?: string | number | null;
  overdue?: string | number | null;
};

export default function CustomersList({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      `${customer.full_name} ${customer.phone} ${customer.customer_code ?? ""} ${customer.address ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [customers, search]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return customers.filter((customer) => {
      const date = new Date(customer.created_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
  }, [customers]);

  const withPhoto = customers.filter((customer) => Boolean(customer.image_url)).length;
  const totalBalance = customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0);

  const stats = [
    { label: "إجمالي العملاء", value: formatNumber(customers.length), hint: "ملف مسجل", icon: UsersRound, tone: "brand" },
    { label: "أُضيفوا هذا الشهر", value: formatNumber(thisMonth), hint: "عميلة جديدة", icon: Sparkles, tone: "success" },
    { label: "لديهن صور", value: formatNumber(withPhoto), hint: "ملفات مكتملة", icon: UserRound, tone: "lav" },
    { label: "إجمالي المديونية", value: formatMoney(totalBalance), hint: "أرصة مستحقة على العميلات", icon: Phone, tone: "warning" },
  ];

  const toneStyles: Record<string, { background: string; color: string }> = {
    brand: { background: "var(--brand-soft)", color: "var(--brand-strong)" },
    lav: { background: "var(--lav-soft)", color: "var(--lav-strong)" },
    success: { background: "var(--success-soft)", color: "var(--success)" },
    warning: { background: "var(--warning-soft)", color: "var(--warning)" },
  };

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">دليل العملاء</p>
          <h1 className="page-title mt-1">العملاء</h1>
          <p className="page-subtitle mt-2 max-w-xl">تعرّفي على عميلاتك واحتفظي ببياناتهن وملاحظاتهن قريبة منك.</p>
        </div>
        <Link href="/customers/new" className="btn btn-primary">
          <Plus size={18} />إضافة عميلة
        </Link>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, hint, icon: Icon, tone }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold muted">{label}</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>{value}</p>
                <p className="mt-1 text-[11px] muted-2">{hint}</p>
              </div>
              <span className="stat-icon" style={toneStyles[tone]}><Icon size={19} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="app-card overflow-hidden">
        <div className="border-b p-5 sm:p-6" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <UsersRound size={21} />
              </span>
              <div>
                <h2 className="section-title">كل العميلات</h2>
                <p className="mt-0.5 text-xs muted">{formatNumber(customers.length)} عميلة مسجلة</p>
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl px-3 py-2.5 sm:w-80" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <Search size={16} style={{ color: "var(--muted-2)" }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحثي بالاسم أو الرقم"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--ink)" }}
              />
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <div>
              <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                <UsersRound size={28} />
              </span>
              <p className="font-extrabold" style={{ color: "var(--ink)" }}>
                {customers.length ? "لا توجد نتائج مطابقة" : "قائمة العميلات بانتظار أول اسم"}
              </p>
              <p className="mx-auto mt-2 max-w-xs text-sm muted">
                {customers.length ? "جرّبي اسمًا أو رقمًا مختلفًا." : "أضيفي أول عميلة لبدء تنظيم علاقاتك وملفاتك."}
              </p>
              {!customers.length && (
                <Link href="/customers/new" className="btn btn-primary mt-5"><Plus size={16} />إضافة أول عميلة</Link>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {visible.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="group flex items-center gap-3 px-5 py-4 transition hover:bg-[var(--surface-2)] sm:px-6"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl text-sm font-extrabold" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                  {customer.image_url ? (
                    <img src={customer.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(customer.full_name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{customer.full_name}</p>
                    {customer.customer_code && (
                      <span className="mono text-[10px]" style={{ color: "var(--muted-2)" }}>{customer.customer_code}</span>
                    )}
                    {Number(customer.phone_count || 0) > 1 && (
                      <span className="badge badge-muted"><Phone size={10} />{formatNumber(Number(customer.phone_count))}</span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs muted" dir="ltr">
                    <Phone size={12} />{customer.phone}
                  </p>
                </div>
                <div className="hidden w-28 text-left sm:block">
                  <p className="text-[10px] muted-2">الرصيد</p>
                  <p className="money text-[12px] font-black" style={{ color: Number(customer.balance || 0) > 0 ? "var(--danger)" : "var(--success)" }}>
                    {formatMoney(customer.balance)}
                  </p>
                  {Number(customer.overdue || 0) > 0 && <p className="text-[9px]" style={{ color: "var(--warning)" }}>متأخر</p>}
                </div>
                <span className="hidden w-24 text-[10px] muted lg:block">{formatDate(customer.created_at)}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition group-hover:bg-[var(--brand-soft)]" style={{ color: "var(--muted-2)" }}>
                  <ArrowLeft size={17} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
