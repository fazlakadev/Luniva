"use client";

import Image from "next/image";
import {
  BadgePercent,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  List,
  LockKeyhole,
  Package,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
} from "lucide-react";
import { useState } from "react";
import InvoiceDocument, { type InvoiceDocumentData } from "@/components/invoice-document";
import PrintInvoiceButton from "@/components/invoice-print-button";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import {
  deliveryStatusLabels,
  deliveryStatusSteps,
  type DeliveryStatus,
} from "@/lib/invoice-shared";

export type PublicInvoiceData = {
  invoiceNumber: string;
  customerName: string;
  maskedPhone: string | null;
  deliveryArea: string | null;
  createdAt: string;
  dueDate: string | null;
  status: "unpaid" | "partial" | "paid" | "cancelled";
  statusLabel: string;
  paymentMethodLabel: string;
  notes: string | null;
  items: Array<{
    name: string;
    description: string | null;
    sku: string | null;
    imageUrl: string | null;
    unitPrice: string | number;
    unitBefore: string | number;
    quantity: number;
    lineTotal: string | number;
  }>;
  subtotal: string | number;
  discountLabel: string;
  discountAmount: string | number;
  deliveryFee: string | number;
  total: string | number;
  paid: string | number;
  remaining: string | number;
  company: {
    name: string;
    tagline: string;
    phone: string;
    address: string;
    taxNumber: string;
    footer: string;
  };
  deliveryStatus: DeliveryStatus;
  deliveryStatusLabel: string;
  qrImage: string;
  document: InvoiceDocumentData;
};

const statusColors: Record<PublicInvoiceData["status"], string> = {
  unpaid: "#b34a61",
  partial: "#a97832",
  paid: "#3f8267",
  cancelled: "#7d6c74",
};

function DeliveryTimeline({ status }: { status: DeliveryStatus }) {
  const activeIndex = deliveryStatusSteps.indexOf(status as Exclude<DeliveryStatus, "cancelled">);
  const cancelled = status === "cancelled";

  return (
    <section className="app-card mt-4 p-4 print-hidden sm:p-6">
      <div className="flex items-center gap-2">
        <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
          <Truck size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">تتبّع التوصيل</h2>
          <p className="mt-0.5 text-[11px] muted-2">تابعي مرحلة طلبك من التجهيز حتى التوصيل.</p>
        </div>
        <span className="badge badge-brand mr-auto">
          <CheckCircle2 size={11} />{deliveryStatusLabels[status]}
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        {deliveryStatusSteps.map((step, index) => {
          const reached = !cancelled && activeIndex >= index;
          const current = !cancelled && activeIndex === index;
          return (
            <div
              key={step}
              className="rounded-2xl p-3"
              style={{
                background: reached ? "var(--success-soft)" : "var(--surface-2)",
                border: `1px solid ${reached ? "color-mix(in srgb, var(--success) 28%, transparent)" : "var(--line)"}`,
              }}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-black"
                style={{
                  background: reached ? "var(--success)" : "var(--surface-3)",
                  color: reached ? "#fff" : "var(--muted-2)",
                }}
              >
                {reached ? <CheckCircle2 size={14} /> : formatNumber(index + 1)}
              </span>
              <p className="mt-2 text-[11px] font-black" style={{ color: reached ? "var(--success)" : "var(--muted)" }}>
                {deliveryStatusLabels[step]}
              </p>
              {current && <p className="mt-1 text-[9px] font-bold" style={{ color: "var(--brand-strong)" }}>المرحلة الحالية</p>}
            </div>
          );
        })}
      </div>

      {cancelled ? (
        <p className="mt-3 rounded-xl px-3 py-2 text-[11px] font-bold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          تم إلغاء توصيل هذا الطلب. للتوضيح تواصلي مع لونيفا.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-5 muted-2">
          <ShieldCheck size={12} className="mt-0.5 shrink-0" />تُحدَّث الحالة من النظام، وستظهر هنا تلقائيًا عند تغييرها.
        </p>
      )}
    </section>
  );
}

export default function PublicInvoiceView({ data }: { data: PublicInvoiceData }) {
  const [mode, setMode] = useState<"cards" | "list">("cards");
  const [openItem, setOpenItem] = useState<number | null>(null);
  const total = Number(data.total || 0);
  const paid = Number(data.paid || 0);
  const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const firstName = data.customerName.trim().split(/\s+/)[0] || "عميلتنا";

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden px-3 py-6 sm:px-6 sm:py-10" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 print-hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm sm:h-12 sm:w-12" style={{ border: "1px solid var(--line)" }}>
              <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={96} height={96} className="h-8 w-8 object-contain sm:h-10 sm:w-10" />
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-black tracking-wide sm:text-base" style={{ color: "var(--ink)" }}>{data.company.name}</p>
              <p className="break-words text-[11px] font-bold" style={{ color: "var(--brand-strong)" }}>{data.company.tagline}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
            <LockKeyhole size={12} />صفحة خاصة بالفاتورة فقط
          </span>
        </header>

        <section
          className="relative overflow-hidden rounded-[1.8rem] px-5 py-7 text-white print-hidden sm:px-9 sm:py-9"
          style={{ background: "linear-gradient(135deg, var(--plum), var(--brand-strong))", boxShadow: "var(--shadow-md)" }}
        >
          <div className="absolute -left-14 -top-16 h-48 w-48 rounded-full border-[26px] border-white/10" />
          <div className="absolute -bottom-20 right-10 h-44 w-44 rounded-full border-[26px] border-white/10" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/85">
                <Sparkles size={13} />فاتورة مبيعات
              </span>
              <h1 className="mono mt-4 text-2xl font-black tracking-wide sm:text-3xl" dir="ltr" style={{ textAlign: "right" }}>{data.invoiceNumber}</h1>
              <p className="mt-2 text-sm font-bold text-white/85">أهلًا {firstName}، هذه تفاصيل فاتورتك</p>
              <p className="mt-1 text-[11px] text-white/65">{formatDate(data.createdAt)}{data.dueDate ? ` · الاستحقاق: ${formatDate(data.dueDate)}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: `${statusColors[data.status]}22`, color: "#fff" }}>
                {data.statusLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/90">
                <Truck size={12} />{data.deliveryStatusLabel}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 print-hidden sm:grid-cols-3">
          <div className="app-card p-4">
            <p className="text-[11px] font-bold muted-2">الإجمالي</p>
            <p className="money mt-1.5 text-lg" style={{ color: "var(--ink)" }}>{formatMoney(data.total)}</p>
          </div>
          <div className="app-card p-4">
            <p className="text-[11px] font-bold muted-2">المدفوع</p>
            <p className="money mt-1.5 text-lg" style={{ color: "var(--success)" }}>{formatMoney(data.paid)}</p>
          </div>
          <div className="app-card p-4">
            <p className="text-[11px] font-bold muted-2">المتبقي</p>
            <p className="money mt-1.5 text-lg" style={{ color: Number(data.remaining) > 0 ? "var(--danger)" : "var(--success)" }}>{formatMoney(data.remaining)}</p>
          </div>
        </section>

        <section className="app-card mt-4 p-4 print-hidden sm:p-6">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between gap-3 text-[11px] font-extrabold">
              <span style={{ color: "var(--ink-soft)" }}>نسبة التحصيل</span>
              <span style={{ color: "var(--brand-strong)" }}>{formatNumber(progress)}%</span>
            </div>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--brand), var(--success))" }} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title flex items-center gap-2"><Package size={17} />منتجات الفاتورة</h2>
              <p className="mt-1 text-[11px] muted-2">{formatNumber(data.items.length)} عنصر · {formatNumber(data.items.reduce((sum, item) => sum + item.quantity, 0))} قطعة</p>
            </div>
            <div className="flex rounded-xl p-1 print-hidden" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <button type="button" onClick={() => setMode("cards")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-extrabold" style={mode === "cards" ? { background: "var(--surface)", color: "var(--brand-strong)", boxShadow: "var(--shadow-sm)" } : { color: "var(--muted)" }}>
                <LayoutGrid size={13} />بطاقات
              </button>
              <button type="button" onClick={() => setMode("list")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-extrabold" style={mode === "list" ? { background: "var(--surface)", color: "var(--brand-strong)", boxShadow: "var(--shadow-sm)" } : { color: "var(--muted)" }}>
                <List size={13} />قائمة
              </button>
            </div>
          </div>

          {mode === "cards" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.items.map((item, index) => {
                const before = Number(item.unitBefore || 0);
                const price = Number(item.unitPrice || 0);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setOpenItem(openItem === index ? null : index)}
                    className="flex min-w-0 items-center gap-3 rounded-2xl p-3 text-right transition hover:-translate-y-0.5"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ReceiptText size={20} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-black" style={{ color: "var(--ink)" }}>{item.name}</span>
                      <span className="mt-0.5 block truncate text-[10px]" style={{ color: "var(--muted)" }}>{item.description || "قطعة ضمن طلبك"}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="money text-[12px]" style={{ color: "var(--brand-strong)" }}>{formatMoney(item.lineTotal)}</span>
                        {before > price && <span className="money text-[9px] line-through" style={{ color: "var(--muted-2)" }}>{formatMoney(before)}</span>}
                        <span className="text-[10px] font-bold" style={{ color: "var(--muted-2)" }}>× {formatNumber(item.quantity)}</span>
                      </span>
                    </span>
                    <ChevronDown size={14} className={`shrink-0 transition ${openItem === index ? "rotate-180" : ""}`} style={{ color: "var(--muted-2)" }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--line)" }}>
              <table className="w-full min-w-[520px] border-collapse text-right">
                <thead>
                  <tr style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                    <th className="px-3 py-2.5 text-[10px] font-black">المنتج</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-black">الكمية</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-black">سعر الوحدة</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-black">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr key={index} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="px-3 py-3">
                        <p className="text-[11px] font-extrabold" style={{ color: "var(--ink)" }}>{item.name}</p>
                        <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted-2)" }}>{item.description || "—"}</p>
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] font-bold">{formatNumber(item.quantity)}</td>
                      <td className="money px-3 py-3 text-left text-[11px]">{formatMoney(item.unitPrice)}</td>
                      <td className="money px-3 py-3 text-left text-[11px] font-black" style={{ color: "var(--brand-strong)" }}>{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {openItem !== null && mode === "cards" && data.items[openItem] && (
            <div className="mt-3 rounded-2xl p-4 text-[11px] leading-6" style={{ background: "var(--lav-soft)", color: "var(--lav-strong)" }}>
              <p className="font-black">{data.items[openItem].name}</p>
              <p className="mt-1">سعر الوحدة: {formatMoney(data.items[openItem].unitPrice)} · الكمية: {formatNumber(data.items[openItem].quantity)}</p>
              {data.items[openItem].sku && <p className="mono mt-1" dir="ltr">{data.items[openItem].sku}</p>}
            </div>
          )}
        </section>

        <section className="app-card mt-4 p-4 print-hidden sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_300px]">
            <div className="min-w-0 space-y-3">
              {data.notes && (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                  <p className="text-[11px] font-black" style={{ color: "var(--brand-strong)" }}>ملاحظات الفاتورة</p>
                  <p className="mt-2 whitespace-pre-line text-[11px] leading-6" style={{ color: "var(--muted)" }}>{data.notes}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }}><ReceiptText size={12} />{data.paymentMethodLabel}</span>
                {data.maskedPhone && <span className="mono inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }} dir="ltr">{data.maskedPhone}</span>}
                {data.deliveryArea && <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "var(--surface-2)" }}><Truck size={12} />{data.deliveryArea}</span>}
              </div>
              <p className="flex items-start gap-2 text-[10px] leading-5" style={{ color: "var(--muted-2)" }}>
                <ShieldCheck size={13} className="mt-0.5 shrink-0" />هذه معاينة للقراءة فقط؛ لا يمكن من هنا الدخول إلى نظام الإدارة أو تعديل أي بيانات.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              <div className="flex items-center justify-between text-[11px]"><span className="muted">الإجمالي الفرعي</span><span className="money">{formatMoney(data.subtotal)}</span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="muted">{data.discountLabel}</span><span className="money" style={{ color: "var(--danger)" }}>− {formatMoney(data.discountAmount)}</span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="muted">التوصيل</span><span className="money">{formatMoney(data.deliveryFee)}</span></div>
              <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--line)" }}>
                <span className="text-[12px] font-black">الإجمالي</span>
                <span className="money text-lg font-black" style={{ color: "var(--brand-strong)" }}>{formatMoney(data.total)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]"><span className="muted">المدفوع</span><span className="money" style={{ color: "var(--success)" }}>{formatMoney(data.paid)}</span></div>
              <div className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-black" style={{ background: Number(data.remaining) > 0 ? "var(--danger-soft)" : "var(--success-soft)", color: Number(data.remaining) > 0 ? "var(--danger)" : "var(--success)" }}>
                <span>المتبقي</span><span className="money">{formatMoney(data.remaining)}</span>
              </div>
              <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] font-bold" style={{ color: "var(--success)" }}><CheckCircle2 size={12} />الأسعار مثبتة لحظة إصدار الفاتورة</p>
            </div>
          </div>
        </section>

        <DeliveryTimeline status={data.deliveryStatus} />

        <section className="app-card mt-4 p-4 print-hidden sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="stat-icon" style={{ background: "var(--brand-soft)", color: "var(--brand-strong)" }}>
                <QrCode size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="section-title">فاتورتك على هاتفك</h2>
                <p className="mt-0.5 text-[11px] muted-2">امسحي الرمز أو افتحي المعاينة في أي وقت.</p>
              </div>
            </div>
            <span className="badge badge-success">
              <Smartphone size={12} />معاينة ومتابعة
            </span>
          </div>

          <div
            className="mt-4 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="min-w-0">
              <p className="text-[12px] font-black" style={{ color: "var(--brand-strong)" }}>امسحي رمز الاستجابة السريعة</p>
              <p className="mt-2 max-w-md text-[11px] leading-7 muted">
                لمعاينة فاتورتك ومتابعة التوصيل من هاتفك.
              </p>
              <div className="mt-3 grid gap-2 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="shrink-0" style={{ color: "var(--success)" }} />ملخص الدفع والفاتورة الكاملة</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="shrink-0" style={{ color: "var(--success)" }} />حالة التوصيل محدَّثة من النظام</p>
              </div>
            </div>
            <div className="shrink-0 self-center rounded-2xl p-3" style={{ background: "var(--brand-soft)", border: "1px solid var(--line)" }}>
              <span className="grid h-36 w-36 place-items-center rounded-xl bg-white p-1.5 sm:h-40 sm:w-40" style={{ border: "1px solid var(--line)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrImage} alt="رمز معاينة الفاتورة" className="h-full w-full rounded-lg" />
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 print-hidden">
          <div className="min-w-0">
            <h2 className="section-title flex items-center gap-2"><ReceiptText size={17} />الفاتورة الرسمية</h2>
            <p className="mt-1 text-[11px] muted-2">النسخة الكاملة كما تُطبع، ومعها رمز الاستجابة السريعة للمعاينة ومتابعة التوصيل.</p>
          </div>
          <PrintInvoiceButton />
        </section>

        <div className="mt-3">
          <InvoiceDocument invoice={data.document} />
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] print-hidden" style={{ color: "var(--muted-2)" }}>
          <span className="flex items-center gap-1.5"><BadgePercent size={12} />{data.company.footer}</span>
          <span>{data.company.name} · {data.invoiceNumber}</span>
        </footer>
      </div>
    </main>
  );
}
