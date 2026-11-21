"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  MapPin,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  XCircle,
  Boxes,
  Gift,
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import { formatWhatsAppPhone, generateWhatsAppUrl } from "@/lib/whatsapp-shared";
import type { CustomerOrder } from "@/lib/orders";

interface AdminOrdersHubProps {
  initialOrders: CustomerOrder[];
}

export default function AdminOrdersHub({ initialOrders }: AdminOrdersHubProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>(initialOrders);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const router = useRouter();
  const toast = useToast();

  const stats = {
    total: orders.length,
    new: orders.filter((o) => o.status === "new").length,
    contacted: orders.filter((o) => o.status === "contacted").length,
    converted: orders.filter((o) => o.status === "converted").length,
    totalValue: orders.reduce((acc, o) => acc + (Number(o.total_estimated) || 0), 0),
  };

  const filteredOrders = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
      );
    }
    return true;
  });

  async function handleStatusChange(id: string, newStatus: any) {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
      toast.success("تم تحديث حالة الطلب", `الحالة الآن: ${newStatus}`);
    } catch {
      toast.error("خطأ", "تعذر تحديث الحالة.");
    }
  }

  async function handleConvertToInvoice(orderId: string) {
    if (convertingId) return;
    setConvertingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر التحويل.");

      toast.success("تم تحويل الطلب إلى فاتورة رسمية بنجاح!", `رقم الفاتورة: ${data.invoiceNumber}`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "converted", converted_invoice_id: data.invoiceId }
            : o,
        ),
      );
      router.push(`/invoices/${data.invoiceId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر التحويل";
      toast.error("خطأ في التحويل", msg);
    } finally {
      setConvertingId(null);
    }
  }

  function getWhatsAppContactUrl(order: CustomerOrder) {
    const clean = formatWhatsAppPhone(order.customer_phone);
    const msg = `مرحباً بكِ أستاذة ${order.customer_name} 🌸\nمن أتيليه لونيفا فاشون.\nتواصلنا معكِ بخصوص استفسار وطلب الشراء رقم *${order.order_number}* عبر موقعنا.\nيسعدنا تأكيد رغبتكِ والاتفاق على موعد البروفة ومقاسات القطع المختارة ✨`;
    return generateWhatsAppUrl(clean, msg);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <Sparkles size={14} />
            طلبات الشراء والاستفسارات من المتجر العام
          </div>
          <h1 className="text-2xl font-black text-ink">استفسارات وطلبات العميلات</h1>
          <p className="text-xs muted mt-1">
            متابعة طلبات الحجز بدون دفع إلكتروني، التواصل المباشر مع العميلات، وتحويلها لفواتير رسمية.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">طلبات جديدة</p>
          <p className="text-xl font-black text-purple-600 mt-1">{stats.new}</p>
          <p className="text-[10px] muted mt-0.5">بانتظار التواصل الأول</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">تم التواصل والمتابعة</p>
          <p className="text-xl font-black text-amber-600 mt-1">{stats.contacted}</p>
          <p className="text-[10px] muted mt-0.5">جارِ الاتفاق والبروفة</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">تحولت لفواتير رسمية</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{stats.converted}</p>
          <p className="text-[10px] muted mt-0.5">مكتملة ومؤكدة</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs font-bold muted">القيمة التقديرية</p>
          <p className="text-xl font-black text-ink mt-1">{formatMoney(stats.totalValue)}</p>
          <p className="text-[10px] muted mt-0.5">إجمالي طلبات الشراء</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="app-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "all", label: "الكل" },
            { key: "new", label: "جديد (لم يتم التواصل)" },
            { key: "contacted", label: "تم التواصل" },
            { key: "converted", label: "محول لفاتورة" },
            { key: "cancelled", label: "ملغي" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filter === tab.key
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-[var(--surface-2)] text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute right-3 top-3 text-muted" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف أو رقم الطلب…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 outline-none w-full sm:w-64"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="app-card p-12 text-center muted space-y-2">
            <ShoppingBag size={32} className="mx-auto text-muted" />
            <p className="text-sm font-bold text-ink">لا توجد طلبات مطابقة للفلتر المحدد.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const waUrl = getWhatsAppContactUrl(order);

            return (
              <div
                key={order.id}
                className="app-card overflow-hidden border transition-all hover:border-purple-300 dark:hover:border-purple-800"
              >
                {/* Order Summary Bar */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 font-black text-xs">
                      <ShoppingBag size={18} />
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono font-black text-xs text-purple-700 dark:text-purple-300" dir="ltr">
                          {order.order_number}
                        </span>
                        <h3 className="text-sm font-black text-ink">{order.customer_name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === "new"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : order.status === "contacted"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : order.status === "converted"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {order.status === "new"
                            ? "طلب جديد"
                            : order.status === "contacted"
                            ? "تم التواصل"
                            : order.status === "converted"
                            ? "محول لفاتورة"
                            : "ملغي"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] muted mt-1">
                        <span className="mono" dir="ltr">
                          <Phone size={11} className="inline ml-1" />
                          {order.customer_phone}
                        </span>
                        {order.customer_address && (
                          <span>
                            <MapPin size={11} className="inline ml-1" />
                            {order.customer_address}
                          </span>
                        )}
                        <span>{new Date(order.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Price */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-[var(--line)]">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-black text-ink block">
                        {formatMoney(order.total_estimated)}
                      </span>
                      <span className="text-[10px] muted">
                        {order.items_count || order.items?.length || 1} قطع
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp 1-Click Action */}
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (order.status === "new") {
                            handleStatusChange(order.id, "contacted");
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-[#25D366] text-white hover:bg-[#20ba59] shadow-sm transition"
                        title="تواصل مباشر عبر واتساب"
                      >
                        <MessageSquare size={13} />
                        واتساب
                      </a>

                      {/* Convert to Invoice */}
                      {order.status !== "converted" ? (
                        <button
                          type="button"
                          onClick={() => handleConvertToInvoice(order.id)}
                          disabled={convertingId === order.id}
                          className="btn btn-primary text-xs px-3 py-1.5 font-black inline-flex items-center gap-1"
                        >
                          <FileText size={13} />
                          {convertingId === order.id ? "جارِ التحويل…" : "إصدار فاتورة"}
                        </button>
                      ) : order.converted_invoice_id ? (
                        <Link
                          href={`/invoices/${order.converted_invoice_id}`}
                          className="btn btn-outline text-xs px-3 py-1.5 font-bold inline-flex items-center gap-1"
                        >
                          <FileText size={13} />
                          عرض الفاتورة
                        </Link>
                      ) : null}

                      {/* Toggle Details */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        className="p-1.5 rounded-xl text-muted hover:text-ink hover:bg-[var(--surface-2)]"
                        title="عرض التفاصيل والقطع"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-[var(--surface-2)] border-t border-[var(--line)] space-y-4">
                    {/* Customer Notes */}
                    {order.notes && (
                      <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                        <span className="font-black block mb-0.5">ملاحظات واستفسار العميلة:</span>
                        <p className="leading-5">{order.notes}</p>
                      </div>
                    )}

                    {/* Items List */}
                    <div>
                      <h4 className="text-xs font-black text-ink mb-2">القطع والمنتجات المطلوبة:</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((it) => (
                            <div
                              key={it.id}
                              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center gap-3"
                            >
                              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border overflow-hidden shrink-0 flex items-center justify-center">
                                {it.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={it.image_url}
                                    alt={it.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : it.item_type === "package" ? (
                                  <Gift size={20} className="text-muted" />
                                ) : (
                                  <Boxes size={20} className="text-muted" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-ink truncate">{it.title}</p>
                                <p className="text-[10px] muted mt-0.5">
                                  {it.color && <span className="ml-2">اللون: {it.color}</span>}
                                  {it.size && <span>المقاس: {it.size}</span>}
                                </p>
                                <p className="text-xs font-bold text-[var(--brand-strong)] mt-0.5">
                                  {it.quantity} × {formatMoney(it.unit_price)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs muted">تفاصيل القطع مسجلة في ملخص الطلب.</p>
                        )}
                      </div>
                    </div>

                    {/* Status Changer Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--line)] text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold muted">تغيير الحالة يدويًا:</span>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 text-xs font-bold"
                        >
                          <option value="new">طلب جديد</option>
                          <option value="contacted">تم التواصل والمتابعة</option>
                          <option value="converted">تم التحويل لفاتورة</option>
                          <option value="cancelled">إلغاء الطلب</option>
                        </select>
                      </div>

                      {order.customer_id && (
                        <Link
                          href={`/customers/${order.customer_id}`}
                          className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                        >
                          <User size={13} />
                          فتح ملف العميلة الكامل
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
