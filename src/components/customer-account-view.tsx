"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { generateWhatsAppUrl } from "@/lib/whatsapp-shared";
import { useToast } from "@/components/toast";

type CustomerInfo = {
  customerId: string;
  fullName: string;
  phone: string;
  email: string | null;
  customerCode: string | null;
  imageUrl: string | null;
};

type OrderItem = {
  id: string;
  item_type: string;
  title: string;
  sku?: string;
  color?: string;
  size?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string | null;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  notes?: string;
  total_estimated: number;
  status: string;
  admin_notes?: string;
  created_at: string;
  items: OrderItem[];
};

export default function CustomerAccountView() {
  const router = useRouter();
  const toast = useToast();

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/customer/me");
        const meData = await meRes.json();
        if (!meRes.ok || !meData.customer) {
          router.replace("/login");
          return;
        }
        setCustomer(meData.customer);

        const ordersRes = await fetch("/api/customer/orders");
        const ordersData = await ordersRes.json();
        if (ordersRes.ok && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        }
      } catch (err) {
        console.error("Account init failed:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/customer/logout", { method: "POST" });
      toast.success("تم تسجيل الخروج", "نراكِ قريباً في متجر لونيفا!");
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "new":
        return (
          <span className="badge badge-brand text-[11px] font-bold">
            <Clock size={11} /> طلب جديد قيد المراجعة
          </span>
        );
      case "contacted":
        return (
          <span className="badge badge-lav text-[11px] font-bold">
            <MessageCircle size={11} /> تم التواصل معكِ
          </span>
        );
      case "confirmed":
        return (
          <span className="badge badge-success text-[11px] font-bold">
            <CheckCircle2 size={11} /> مؤكد وجارِ التجهيز
          </span>
        );
      case "completed":
        return (
          <span className="badge badge-success text-[11px] font-bold">
            <CheckCircle2 size={11} /> تم التسليم بنجاح
          </span>
        );
      case "cancelled":
        return (
          <span className="badge badge-warning text-[11px] font-bold">
            ملغي
          </span>
        );
      default:
        return (
          <span className="badge badge-muted text-[11px] font-bold">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-[var(--brand)]" />
        <p className="text-sm font-bold text-[var(--muted)]">جارِ فتح حسابكِ...</p>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-8">
      {/* Header Profile Card */}
      <div className="app-card relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {customer.imageUrl ? (
              <Image
                src={customer.imageUrl}
                alt={customer.fullName}
                width={72}
                height={72}
                className="h-16 w-16 rounded-2xl border-2 border-[var(--brand)] object-cover shadow-sm sm:h-18 sm:w-18"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-inner sm:h-18 sm:w-18">
                <User size={32} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black sm:text-2xl" style={{ color: "var(--ink)" }}>
                  أهلاً بكِ، {customer.fullName}
                </h1>
                <span className="badge badge-lav text-[10px] font-black">عميلة مميزة</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)] font-medium">
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-[var(--brand-strong)]" />
                  <span dir="ltr">{customer.phone}</span>
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-[var(--brand-strong)]" />
                    <span>{customer.email}</span>
                  </span>
                )}
                {customer.customerCode && (
                  <span className="badge badge-muted text-[10px] font-mono">
                    {customer.customerCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/cart"
              className="btn btn-secondary text-xs font-bold"
            >
              <ShoppingBag size={14} />
              سلة الاستفسارات
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-600 hover:bg-red-500/20 dark:text-red-400"
            >
              <LogOut size={14} />
              {loggingOut ? "جارِ الخروج..." : "تسجيل الخروج"}
            </button>
          </div>
        </div>
      </div>

      {/* Orders & Inquiries List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black" style={{ color: "var(--ink)" }}>
              سجل استفساراتكِ وطلبات الشراء ({orders.length})
            </h2>
            <p className="text-xs text-[var(--muted)]">
              جميع طلبات الاستفسار التي قمتِ بإرسالها للأتيليه مع حالتها وتفاصيلها.
            </p>
          </div>

          <Link
            href="/catalog/products"
            className="text-xs font-black text-[var(--brand-strong)] hover:underline flex items-center gap-1"
          >
            تصفح الكتالوج <ArrowLeft size={13} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="app-card flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
              <ShoppingBag size={32} />
            </div>
            <h3 className="mt-4 text-base font-black text-[var(--ink)]">
              لا توجد طلبات أو استفسارات سابقة بعد
            </h3>
            <p className="mt-1 max-w-sm text-xs text-[var(--muted)]">
              تصفحي تشكيلات الفساتين والبكدجات واختاري ما يعجبكِ لإرسال طلب استفسار للأتيليه.
            </p>
            <Link
              href="/catalog/products"
              className="btn btn-primary mt-5 text-xs font-black"
            >
              استكشفي أحدث الموديلات
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderWhatsapp = generateWhatsAppUrl(
                "01004140026",
                `مرحباً لونيفا، أود المتابعة بخصوص طلبي رقم: ${order.order_number}`,
              );

              return (
                <div
                  key={order.id}
                  className="app-card overflow-hidden p-5 sm:p-6 transition hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-black text-[var(--ink)]">
                        {order.order_number}
                      </span>
                      {getStatusBadge(order.status)}
                      <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        <Calendar size={12} />
                        {new Date(order.created_at).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <span className="text-[10px] text-[var(--muted-2)] block">
                          إجمالي تقديري
                        </span>
                        <span className="money text-base font-black text-[var(--brand-strong)]">
                          {formatMoney(order.total_estimated)}
                        </span>
                      </div>

                      <a
                        href={orderWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                        title="متابعة عبر واتساب"
                      >
                        <MessageCircle size={14} />
                        <span>متابعة</span>
                      </a>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="mt-4 divide-y divide-[var(--line)]">
                    {order.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {it.image_url ? (
                            <Image
                              src={it.image_url}
                              alt={it.title}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-lg border border-[var(--line)] object-cover"
                            />
                          ) : (
                            <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
                              <Package size={20} />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-black text-[var(--ink)]">
                              {it.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-[var(--muted)]">
                              {it.color && <span>اللون: {it.color}</span>}
                              {it.size && <span>المقاس: {it.size}</span>}
                              <span>الكمية: {it.quantity}</span>
                            </div>
                          </div>
                        </div>

                        <span className="money text-xs font-black text-[var(--ink)]">
                          {formatMoney(it.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Notes if any */}
                  {order.notes && (
                    <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--muted)]">
                      <span className="font-bold text-[var(--ink)]">ملاحظاتكِ: </span>
                      {order.notes}
                    </div>
                  )}

                  {order.admin_notes && (
                    <div className="mt-2 rounded-xl bg-[var(--brand-soft)] p-2.5 text-[11px] text-[var(--brand-strong)]">
                      <span className="font-bold">رد الأتيليه: </span>
                      {order.admin_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
