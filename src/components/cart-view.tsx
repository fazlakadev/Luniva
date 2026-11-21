"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Phone,
  User,
  MapPin,
  Mail,
  Send,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Gift,
  Boxes,
} from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/components/toast";

export default function CartView() {
  const { items, total, count, updateQuantity, removeItem, clear, mounted } = useCart();
  const toast = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    orderNumber: string;
    totalEstimated: number;
    whatsappUrl: string;
  } | null>(null);

  // Auto-fill logged-in customer info
  useEffect(() => {
    fetch("/api/customer/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.customer) {
          setIsLoggedIn(true);
          if (data.customer.fullName) setCustomerName(data.customer.fullName);
          if (data.customer.phone) setCustomerPhone(data.customer.phone);
          if (data.customer.email) setCustomerEmail(data.customer.email);
        }
      })
      .catch(() => null);
  }, []);

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("بيانات ناقصة", "يرجى إدخال اسمكِ ورقم هاتفكِ لتأكيد الاستفسار.");
      return;
    }
    if (items.length === 0) {
      toast.error("السلة فارغة", "يرجى إضافة قطع إلى السلة أولاً.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          notes: notes.trim() || undefined,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "تعذر إرسال الطلب");

      setOrderResult({
        orderNumber: data.orderNumber,
        totalEstimated: data.totalEstimated,
        whatsappUrl: data.whatsappUrl,
      });

      clear();
      toast.success("تم إرسال طلب الحجز بنجاح!", "سنتواصل معكِ لتأكيد كافة التفاصيل.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر إرسال الطلب";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return <div className="p-12 text-center muted">جارِ تحميل السلة…</div>;
  }

  // Success Confirmation State
  if (orderResult) {
    return (
      <div className="max-w-xl mx-auto app-card p-6 sm:p-10 text-center space-y-6 shadow-2xl border-2 border-emerald-500/30">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center">
          <CheckCircle2 size={36} />
        </div>

        <div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            تم استلام طلب الحجز والاستفسار
          </span>
          <h1 className="text-2xl font-black text-ink mt-3">شكراً لاختياركِ لونيفا فاشون ✨</h1>
          <p className="mono text-sm font-black text-purple-600 dark:text-purple-400 mt-1" dir="ltr">
            {orderResult.orderNumber}
          </p>
          <p className="text-xs muted mt-2 max-w-md mx-auto leading-6">
            تم تسجيل استفساركِ بنجاح بقيمة تقديرية{" "}
            <b className="text-ink">{formatMoney(orderResult.totalEstimated)}</b>. سيتواصل معكِ فريق
            لونيفا هاتفياً لتأكيد المقاسات وموعد البروفة/التسليم.
          </p>
        </div>

        {/* WhatsApp Immediate Action */}
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
          <p className="text-xs font-black text-emerald-900 dark:text-emerald-200">
            لتأكيد وتنسيق طلبكِ في الحال، يمكنكِ مراسلتنا مباشرة عبر واتساب:
          </p>
          <a
            href={orderResult.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn py-3 text-xs font-black bg-[#25D366] text-white hover:bg-[#20ba59] shadow-lg shadow-emerald-500/20 inline-flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            تأكيد الطلب ومراسلة الأتيليه عبر واتساب الآن
          </a>
        </div>

        <div>
          <Link
            href="/catalog"
            className="btn btn-outline text-xs px-6 py-2.5 font-bold inline-flex items-center gap-1.5"
          >
            <ArrowRight size={14} />
            متابعة استكشاف الكتالوج
          </Link>
        </div>
      </div>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto app-card p-10 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--surface-2)] text-muted grid place-items-center">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-lg font-black text-ink">سلة الطلبات فارغة حالياً</h2>
        <p className="text-xs muted leading-6">
          تصفحي تشكيلة الفساتين والبكدجات الحصرية واختاري القطع التي تناسب ذوقكِ لإرسال طلب حجزها.
        </p>
        <Link href="/catalog" className="btn btn-primary text-xs px-6 py-2.5 font-black inline-block mt-2">
          استكشاف الكتالوج
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <ShoppingBag size={24} className="text-[var(--brand-strong)]" />
            سلة طلبات الحجز والاستفسار ({count} قطع)
          </h1>
          <p className="text-xs muted mt-1">
            راجعي القطع المختارة وأرسلي طلب الاستفسار وسنتواصل معكِ لتأكيد التفاصيل.
          </p>
        </div>
        <button
          onClick={clear}
          className="text-xs text-rose-500 hover:text-rose-700 font-bold inline-flex items-center gap-1"
        >
          <Trash2 size={13} />
          تفريغ السلة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cart Items List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="app-card divide-y border border-[var(--line)] overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-[var(--surface-2)] transition">
                {/* Item Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : item.itemType === "package" ? (
                    <Gift size={24} className="text-muted" />
                  ) : (
                    <Boxes size={24} className="text-muted" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-ink truncate">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] muted mt-1">
                    {item.color && <span>اللون: <b className="text-ink">{item.color}</b></span>}
                    {item.size && <span>المقاس: <b className="text-ink">{item.size}</b></span>}
                    {item.sku && <span className="mono font-bold" dir="ltr">{item.sku}</span>}
                  </div>
                  <p className="text-xs font-black text-[var(--brand-strong)] mt-1">
                    {formatMoney(item.price)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-lg text-muted hover:text-ink hover:bg-[var(--surface-2)]"
                    title="تقليل الكمية"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-black px-1.5 min-w-[20px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-lg text-muted hover:text-ink hover:bg-[var(--surface-2)]"
                    title="زيادة الكمية"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg text-muted hover:text-rose-600 transition shrink-0"
                  title="حذف القطعة"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Sizing & Customization Notice */}
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-600" />
              خدمة التفصيل وتعديل المقاسات:
            </p>
            <p className="text-[11px] leading-5 text-purple-800 dark:text-purple-300">
              يمكنكِ طلب تعديل أي مقاس أو استشارة تفصيل مخصصة بكتابة رغبتكِ في حقل الملاحظات أدناه.
            </p>
          </div>
        </div>

        {/* Right Column: Checkout Inquiry Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="app-card p-5 sm:p-6 space-y-5 border-2 border-[var(--brand)]/30">
            <div>
              <h2 className="text-sm font-black text-ink flex items-center justify-between">
                <span>بيانات تأكيد الحجز والاستفسار</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} /> بدون دفع إلكتروني
                </span>
              </h2>
              <p className="text-[11px] muted mt-1 leading-5">
                لا يتطلب إدخال أي بطاقات دفع. سنراجع الطلب ونتواصل معكِ مباشرة لتأكيد التجهيز.
              </p>
            </div>

            {!isLoggedIn && (
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-between gap-2 text-xs">
                <span className="text-muted text-[11px]">لديكِ حساب عميلة مسجل؟</span>
                <Link href={`/login?returnTo=/cart`} className="font-black text-[var(--brand-strong)] underline text-[11px]">
                  تسجيل الدخول لتعبئة البيانات تلقائياً
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center gap-1">
                  <User size={12} className="text-[var(--brand-strong)]" />
                  اسم العميلة بالكامل:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سارة محمد"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[var(--brand)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-[#25D366]" />
                  رقم هاتف الواتساب للتواصل:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center gap-1">
                  <Mail size={12} className="text-muted" />
                  البريد الإلكتروني (اختياري لاستلام إشعار بالرد):
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  dir="ltr"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs text-right focus:ring-2 focus:ring-[var(--brand)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center gap-1">
                  <MapPin size={12} className="text-muted" />
                  العنوان أو المحافظة:
                </label>
                <input
                  type="text"
                  placeholder="مثال: القاهرة، مدينة نصر"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[var(--brand)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  ملاحظات خاصة، استفسار مقاس، أو موعد بروفة مفضل:
                </label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل ترغبين بإضافتها لفريق العمل…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 text-xs focus:ring-2 focus:ring-[var(--brand)] outline-none"
                />
              </div>

              {/* Total & Summary Box */}
              <div className="pt-3 border-t border-[var(--line)] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span>عدد القطع:</span>
                  <span className="text-ink">{count} قطع</span>
                </div>
                <div className="flex items-center justify-between text-sm font-black">
                  <span>الإجمالي التقديري:</span>
                  <span className="text-lg text-[var(--brand-strong)]">{formatMoney(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3.5 text-xs font-black shadow-lg shadow-[var(--brand)]/20 inline-flex items-center justify-center gap-2 mt-2"
              >
                <Send size={15} />
                {loading ? "جارِ إرسال طلب الحجز…" : "إرسال طلب الحجز والاستفسار"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
