import Image from "next/image";
import {
  Building2,
  CalendarDays,
  CreditCard,
  Hash,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRound,
} from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import {
  deliveryStatusLabels,
  invoiceStatusLabels,
  paymentMethodLabels,
  type DeliveryStatus,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/invoice-shared";
import { discountTypeLabels, type DiscountType } from "@/lib/packages";
import type { CompanySettings } from "@/lib/settings";

export type InvoiceDocumentItem = {
  id: string;
  item_type: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_before: string | number;
  unit_price: string | number;
  quantity: number;
  line_before: string | number;
  line_total: string | number;
};

export type InvoiceDocumentData = {
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  customer_code?: string | null;
  delivery_area: string | null;
  subtotal: string | number;
  discount_type: DiscountType;
  discount_value: string | number;
  discount_amount: string | number;
  delivery_fee: string | number;
  total: string | number;
  paid_amount: string | number;
  status: InvoiceStatus;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  due_date?: string | null;
  items: InvoiceDocumentItem[];
  company?: CompanySettings;
  qrImage?: string;
  deliveryStatus?: DeliveryStatus;
};

const INK = "#2b2228";
const INK_SOFT = "#4a3c44";
const MUTED = "#7a6770";
const LINE = "#eadcdf";
const LINE_LIGHT = "#f3ebed";
const BRAND = "#800020"; // Classic Royal Burgundy
const BRAND_STRONG = "#540917"; // Deep Burgundy
const BRAND_SOFT = "#fbf0f2"; // Soft Burgundy Tint
const SURFACE_SOFT = "#fdf9fa";
const SUCCESS = "#2d7a58";
const SUCCESS_SOFT = "#edf8f2";
const WARNING = "#a06c28";
const WARNING_SOFT = "#fbf3e6";
const DANGER = "#a32840";
const DANGER_SOFT = "#fdefef";

export default function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  const paid = Number(invoice.paid_amount || 0);
  const total = Number(invoice.total || 0);
  const remaining = Math.max(0, total - paid);
  const discountAmount = Number(invoice.discount_amount || 0);
  const discountLabel =
    invoice.discount_type === "percent"
      ? `خصم ${formatNumber(invoice.discount_value)}%`
      : discountTypeLabels[invoice.discount_type] ?? "خصم";

  const statusColor =
    invoice.status === "paid"
      ? SUCCESS
      : invoice.status === "partial"
        ? WARNING
        : invoice.status === "cancelled"
          ? MUTED
          : DANGER;

  return (
    <article
      className="invoice-sheet mx-auto w-full max-w-[880px] overflow-hidden rounded-2xl bg-white shadow-sm print:max-w-none print:rounded-none print:shadow-none print:bg-white"
      dir="rtl"
    >
      {/* Cancelled Banner */}
      {invoice.status === "cancelled" && (
        <div className="invoice-cancel-bar bg-rose-700 px-5 py-2 text-center text-xs font-black text-white print:py-1">
          فاتورة ملغاة — غير صالحة للتحصيل أو التداول
        </div>
      )}

      {/* Royal Burgundy Top Bar */}
      <div
        className="h-2 w-full print:h-1.5"
        style={{
          background: "linear-gradient(90deg, #b83d58 0%, #800020 50%, #540917 100%)",
        }}
      />

      <div className="p-6 sm:p-8 print:p-3 print:pt-2">
        {/* ========================================================= */}
        {/* 1. HEADER: BRAND & INVOICE IDENTIFIERS                   */}
        {/* ========================================================= */}
        <header
          className="flex flex-wrap items-start justify-between gap-4 border-b pb-5 print:pb-2.5"
          style={{ borderColor: LINE }}
        >
          {/* Company Brand Block */}
          <div className="flex items-center gap-3.5 print:gap-2.5">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white shadow-xs print:h-12 print:w-12 print:rounded-xl"
              style={{ border: `1px solid ${LINE}` }}
            >
              <Image
                src="/luniva-logo-v2.png"
                alt="شعار لونيفا"
                width={128}
                height={128}
                className="h-11 w-11 object-contain print:h-9 print:w-9"
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-[0.08em] print:text-lg" style={{ color: BRAND_STRONG }}>
                  {invoice.company?.companyName ?? "لونيفا LUNIVA"}
                </h1>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold print:text-[8px]"
                  style={{ background: BRAND_SOFT, color: BRAND }}
                >
                  أزياء نسائية فاخرة
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-bold print:text-[9px]" style={{ color: BRAND }}>
                {invoice.company?.companyTagline ?? "شركة ملابس نسائية مصرية — جودة وتفصيل استثنائي"}
              </p>
              {(invoice.company?.companyPhone || invoice.company?.companyAddress || invoice.company?.taxNumber) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-4 print:text-[8px]" style={{ color: MUTED }}>
                  {invoice.company?.companyPhone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={10} style={{ color: BRAND }} />
                      <span dir="ltr">{invoice.company.companyPhone}</span>
                    </span>
                  )}
                  {invoice.company?.companyAddress && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} style={{ color: BRAND }} />
                      <span>{invoice.company.companyAddress}</span>
                    </span>
                  )}
                  {invoice.company?.taxNumber && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 size={10} style={{ color: BRAND }} />
                      <span>سجل ضريبي: {invoice.company.taxNumber}</span>
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Meta Badges */}
          <div className="text-left sm:text-left print:text-left">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black print:px-2 print:py-0.5 print:text-[9px]"
              style={{ background: BRAND_SOFT, color: BRAND }}
            >
              <ReceiptText size={13} />
              فاتورة مبيعات رسمية
            </span>

            <p className="mono mt-1.5 text-xl font-black tracking-wide print:text-lg" dir="ltr" style={{ color: INK }}>
              {invoice.invoice_number}
            </p>

            <div className="mt-1.5 flex flex-wrap justify-end gap-1.5 print:gap-1">
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black print:text-[8px] print:px-2"
                style={{
                  background: `${statusColor}14`,
                  borderColor: `${statusColor}33`,
                  color: statusColor,
                }}
              >
                {invoiceStatusLabels[invoice.status]}
              </span>

              {invoice.deliveryStatus && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black print:text-[8px] print:px-2"
                  style={{ background: "#edf3f8", borderColor: "#d6e4ee", color: "#3d6683" }}
                >
                  <Truck size={10} />
                  {deliveryStatusLabels[invoice.deliveryStatus]}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. DEVELOPED DETAILS SECTION (EXPLICIT TITLES & LABELS)  */}
        {/* ========================================================= */}
        <section className="mt-5 grid gap-3 sm:grid-cols-2 print:mt-2.5 print:gap-2">
          {/* Panel A: Customer & Delivery Details */}
          <div
            className="rounded-2xl p-4 print:rounded-xl print:p-2.5"
            style={{ background: SURFACE_SOFT, border: `1px solid ${LINE}` }}
          >
            <div className="flex items-center gap-2 border-b pb-2 print:pb-1.5" style={{ borderColor: LINE_LIGHT }}>
              <span
                className="grid h-6 w-6 place-items-center rounded-lg print:h-5 print:w-5"
                style={{ background: BRAND_SOFT, color: BRAND }}
              >
                <UserRound size={13} />
              </span>
              <h2 className="text-xs font-black tracking-wide print:text-[11px]" style={{ color: BRAND_STRONG }}>
                بيانات العميلة وموقع التسليم:
              </h2>
            </div>

            <div className="mt-2.5 space-y-1.5 text-xs print:mt-1.5 print:space-y-1 print:text-[10px]">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  اسم العميلة:
                </span>
                <span className="font-black text-sm print:text-xs" style={{ color: INK }}>
                  {invoice.customer_name}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  رقم الهاتف:
                </span>
                <span className="mono font-bold" dir="ltr" style={{ color: INK_SOFT }}>
                  {invoice.customer_phone || "—"}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  العنوان بالتفصيل:
                </span>
                <span className="font-semibold leading-relaxed" style={{ color: INK_SOFT }}>
                  {invoice.customer_address || "استلام من الفرع / لم يُحدد عنوان تفصيلي"}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  منطقة الشحن:
                </span>
                <span className="font-bold" style={{ color: INK }}>
                  {invoice.delivery_area || "الفرع الرئيسي / شحن داخلي"}
                </span>
              </div>

              {invoice.customer_code && (
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                    كود العميلة:
                  </span>
                  <span className="mono font-bold" dir="ltr" style={{ color: BRAND_STRONG }}>
                    {invoice.customer_code}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Panel B: Invoice & Payment Parameters */}
          <div
            className="rounded-2xl p-4 print:rounded-xl print:p-2.5"
            style={{ background: SURFACE_SOFT, border: `1px solid ${LINE}` }}
          >
            <div className="flex items-center gap-2 border-b pb-2 print:pb-1.5" style={{ borderColor: LINE_LIGHT }}>
              <span
                className="grid h-6 w-6 place-items-center rounded-lg print:h-5 print:w-5"
                style={{ background: BRAND_SOFT, color: BRAND }}
              >
                <Hash size={13} />
              </span>
              <h2 className="text-xs font-black tracking-wide print:text-[11px]" style={{ color: BRAND_STRONG }}>
                تفاصيل الفاتورة والسداد:
              </h2>
            </div>

            <div className="mt-2.5 space-y-1.5 text-xs print:mt-1.5 print:space-y-1 print:text-[10px]">
              <div className="flex items-baseline justify-between">
                <span className="font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  رقم الفاتورة:
                </span>
                <span className="mono font-black" dir="ltr" style={{ color: INK }}>
                  {invoice.invoice_number}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  تاريخ الإصدار:
                </span>
                <span className="font-bold" style={{ color: INK_SOFT }}>
                  {formatDate(invoice.created_at)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  تاريخ الاستحقاق:
                </span>
                <span className="font-bold" style={{ color: invoice.due_date ? INK_SOFT : MUTED }}>
                  {invoice.due_date ? formatDate(invoice.due_date) : "استحقاق فوري عند الاستلام"}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  طريقة الدفع:
                </span>
                <span className="font-black" style={{ color: INK }}>
                  {paymentMethodLabels[invoice.payment_method]}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-extrabold text-[11px] print:text-[9.5px]" style={{ color: BRAND }}>
                  حالة السداد:
                </span>
                <span className="font-black" style={{ color: statusColor }}>
                  {invoiceStatusLabels[invoice.status]}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Highlights Row (4 Mini KPI cards) */}
        <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 print:mt-2 print:gap-1.5">
          <div className="rounded-xl p-2.5 text-center print:p-1.5" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            <p className="text-[10px] font-bold print:text-[8px]" style={{ color: MUTED }}>إجمالي الفاتورة</p>
            <p className="money mt-0.5 text-sm font-black print:text-xs" style={{ color: BRAND }}>{formatMoney(total)}</p>
          </div>
          <div className="rounded-xl p-2.5 text-center print:p-1.5" style={{ background: SUCCESS_SOFT, border: `1px solid ${SUCCESS}25` }}>
            <p className="text-[10px] font-bold print:text-[8px]" style={{ color: SUCCESS }}>المدفوع مقدماً</p>
            <p className="money mt-0.5 text-sm font-black print:text-xs" style={{ color: SUCCESS }}>{formatMoney(paid)}</p>
          </div>
          <div
            className="rounded-xl p-2.5 text-center print:p-1.5"
            style={{
              background: remaining > 0 ? DANGER_SOFT : SUCCESS_SOFT,
              border: `1px solid ${remaining > 0 ? `${DANGER}25` : `${SUCCESS}25`}`,
            }}
          >
            <p className="text-[10px] font-bold print:text-[8px]" style={{ color: remaining > 0 ? DANGER : SUCCESS }}>
              {remaining > 0 ? "المتبقي للتحصيل" : "الحساب مسدد بالكامل"}
            </p>
            <p className="money mt-0.5 text-sm font-black print:text-xs" style={{ color: remaining > 0 ? DANGER : SUCCESS }}>
              {formatMoney(remaining)}
            </p>
          </div>
          <div className="rounded-xl p-2.5 text-center print:p-1.5" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            <p className="text-[10px] font-bold print:text-[8px]" style={{ color: MUTED }}>عدد الأصناف</p>
            <p className="mt-0.5 text-sm font-black print:text-xs" style={{ color: INK }}>
              {formatNumber(invoice.items.length)} صنف
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. ITEMS TABLE (COMPACT, HIGH CONTRAST, PRINT-SAFE)      */}
        {/* ========================================================= */}
        <section className="mt-4 overflow-hidden rounded-2xl print:mt-2 print:rounded-xl" style={{ border: `1px solid ${LINE}` }}>
          <table className="w-full border-collapse text-right text-xs print:text-[10px]">
            <thead>
              <tr style={{ background: BRAND_SOFT, borderBottom: `1px solid ${BRAND}33` }}>
                <th className="px-3 py-2.5 font-black print:px-2 print:py-1.5" style={{ color: BRAND_STRONG }}>#</th>
                <th className="px-3 py-2.5 font-black print:px-2 print:py-1.5" style={{ color: BRAND_STRONG }}>بيان الصنف / المنتج</th>
                <th className="px-3 py-2.5 font-black print:px-2 print:py-1.5" style={{ color: BRAND_STRONG }}>كود القطعة (SKU)</th>
                <th className="px-3 py-2.5 text-center font-black print:px-2 print:py-1.5" style={{ color: BRAND_STRONG }}>الكمية</th>
                <th className="px-3 py-2.5 text-left font-black print:px-2 print:py-1.5" style={{ color: BRAND_STRONG }}>سعر الوحدة</th>
                <th className="px-3 py-2.5 text-left font-black print:px-2 print:py-1.5" style={{ color: BRAND_STRONG }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const before = Number(item.unit_before || 0);
                const price = Number(item.unit_price || 0);
                return (
                  <tr
                    key={item.id}
                    className="print:break-inside-avoid"
                    style={{
                      borderTop: index > 0 ? `1px solid ${LINE_LIGHT}` : undefined,
                      background: index % 2 === 0 ? "#ffffff" : "#fdfafb",
                    }}
                  >
                    <td className="px-3 py-2.5 align-middle text-[11px] font-bold print:px-2 print:py-1.5 print:text-[9px]" style={{ color: MUTED }}>
                      {formatNumber(index + 1)}
                    </td>
                    <td className="px-3 py-2.5 align-middle print:px-2 print:py-1.5">
                      <p className="font-extrabold text-[12px] print:text-[10px]" style={{ color: INK }}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="mt-0.5 text-[10px] leading-3 print:hidden" style={{ color: MUTED }}>
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="mono px-3 py-2.5 align-middle text-[10px] print:px-2 print:py-1.5 print:text-[9px]" dir="ltr" style={{ color: MUTED }}>
                      {item.sku || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center align-middle font-black print:px-2 print:py-1.5" style={{ color: INK }}>
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-3 py-2.5 text-left align-middle print:px-2 print:py-1.5">
                      <p className="money font-bold" style={{ color: INK }}>
                        {formatMoney(price)}
                      </p>
                      {before > price && (
                        <p className="money text-[9px] line-through print:text-[8px]" style={{ color: MUTED }}>
                          {formatMoney(before)}
                        </p>
                      )}
                    </td>
                    <td className="money px-3 py-2.5 text-left align-middle font-black print:px-2 print:py-1.5" style={{ color: BRAND }}>
                      {formatMoney(item.line_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ========================================================= */}
        {/* 4. TOTALS & NOTES SECTION (SPACE EFFICIENT)               */}
        {/* ========================================================= */}
        <section className="mt-4 grid gap-3 sm:grid-cols-[1fr_310px] print:mt-2.5 print:grid-cols-[1fr_260px] print:gap-2">
          {/* Notes and Trust statement */}
          <div className="flex flex-col justify-between">
            {invoice.notes ? (
              <div
                className="rounded-2xl p-3.5 print:rounded-xl print:p-2"
                style={{
                  background: SURFACE_SOFT,
                  border: `1px solid ${LINE}`,
                  borderRight: `3px solid ${BRAND}`,
                }}
              >
                <p className="text-[11px] font-black print:text-[9.5px]" style={{ color: BRAND }}>
                  ملاحظات وتفاصيل خاصة بالطلب:
                </p>
                <p className="mt-1 whitespace-pre-line text-[11px] leading-5 print:text-[9px] print:leading-4" style={{ color: INK_SOFT }}>
                  {invoice.notes}
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl p-3.5 print:rounded-xl print:p-2"
                style={{ background: SURFACE_SOFT, border: `1px solid ${LINE}` }}
              >
                <p className="text-[11px] font-black print:text-[9.5px]" style={{ color: BRAND }}>
                  إرشادات الاستلام والاستبدال:
                </p>
                <p className="mt-1 text-[10.5px] leading-5 print:text-[8.5px] print:leading-4" style={{ color: MUTED }}>
                  الاحتفاظ بأصل هذه الفاتورة يسهّل عملية المتابعة والاستبدال والاسترجاع طبقاً لسياسة المتجر خلال 14 يوماً من تاريخ الاستلام.
                </p>
              </div>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-4 print:text-[8px] print:mt-1" style={{ color: MUTED }}>
              <ShieldCheck size={12} className="shrink-0" style={{ color: SUCCESS }} />
              فاتورة إلكترونية معتمدة وموثقة لحظة الإصدار من نظام لونيفا للأزياء.
            </p>
          </div>

          {/* Financial Totals Box */}
          <div
            className="space-y-1.5 rounded-2xl p-3.5 print:rounded-xl print:p-2 print:space-y-1"
            style={{ background: SURFACE_SOFT, border: `1px solid ${LINE}` }}
          >
            <div className="flex items-center justify-between text-xs print:text-[9.5px]">
              <span className="font-bold" style={{ color: MUTED }}>الإجمالي الفرعي:</span>
              <span className="money font-black" style={{ color: INK }}>{formatMoney(invoice.subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs print:text-[9.5px]">
                <span className="font-bold" style={{ color: DANGER }}>{discountLabel}:</span>
                <span className="money font-black" style={{ color: DANGER }}>− {formatMoney(discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs print:text-[9.5px]">
              <span className="font-bold" style={{ color: MUTED }}>تكلفة الشحن والتوصيل:</span>
              <span className="money font-black" style={{ color: INK }}>
                {Number(invoice.delivery_fee) > 0 ? formatMoney(invoice.delivery_fee) : "مجاناً"}
              </span>
            </div>

            <div
              className="flex items-center justify-between rounded-xl px-3 py-2 print:py-1.5 print:px-2.5"
              style={{ background: BRAND_SOFT, border: `1px solid ${BRAND}25` }}
            >
              <span className="text-xs font-black print:text-[10px]" style={{ color: BRAND_STRONG }}>
                صافي الفاتورة الإجمالي:
              </span>
              <span className="money text-base font-black print:text-sm" style={{ color: BRAND }}>
                {formatMoney(invoice.total)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs print:text-[9.5px]">
              <span className="font-bold" style={{ color: SUCCESS }}>المدفوع:</span>
              <span className="money font-black" style={{ color: SUCCESS }}>{formatMoney(paid)}</span>
            </div>

            <div
              className="flex items-center justify-between rounded-xl px-2.5 py-1.5 print:py-1"
              style={{
                background: remaining > 0 ? DANGER_SOFT : SUCCESS_SOFT,
                border: `1px solid ${remaining > 0 ? `${DANGER}25` : `${SUCCESS}25`}`,
              }}
            >
              <span
                className="text-[11px] font-black print:text-[9px]"
                style={{ color: remaining > 0 ? DANGER : SUCCESS }}
              >
                {remaining > 0 ? "المطلوب عند الاستلام:" : "حالة التحصيل:"}
              </span>
              <span
                className="money text-xs font-black print:text-[10px]"
                style={{ color: remaining > 0 ? DANGER : SUCCESS }}
              >
                {remaining > 0 ? formatMoney(remaining) : "خالص بالكامل ✓"}
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. FOOTER & COMPACT VERIFICATION QR CODE                  */}
        {/* ========================================================= */}
        <footer
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 print:mt-2.5 print:pt-2"
          style={{ borderColor: LINE, color: MUTED }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black print:text-[10px]" style={{ color: BRAND_STRONG }}>
              {invoice.company?.receiptFooter ?? "شكرًا لتعاملكِ مع لونيفا للأزياء — نسعد بخدمتكِ دائمًا 🌸"}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 print:text-[8px]" style={{ color: MUTED }}>
              لأي استفسار تاصلي معنا عبر هاتف المتجر أو خدمة العملاء عبر واتساب.
            </p>
            <p className="mono mt-1 text-[9px] print:text-[7.5px]" dir="ltr">
              {invoice.company?.companyName ?? "Luniva"} · {invoice.invoice_number} · {new Date(invoice.created_at).toLocaleDateString("ar-EG")}
            </p>
          </div>

          {invoice.qrImage && (
            <div
              className="flex items-center gap-3 rounded-2xl border-2 p-2.5 bg-white shadow-xs print:rounded-xl print:p-1.5 print:border print:shadow-none"
              style={{ borderColor: LINE, background: "#ffffff" }}
            >
              <span
                className="grid h-24 w-24 sm:h-28 sm:w-28 shrink-0 place-items-center rounded-xl bg-white p-2 shadow-xs print:h-20 print:w-20 print:p-1"
                style={{ border: `1.5px solid ${LINE}`, background: "#ffffff" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invoice.qrImage}
                  alt="رمز التحقق من الفاتورة"
                  className="h-full w-full object-contain bg-white"
                  style={{ background: "#ffffff" }}
                />
              </span>
              <div className="min-w-0 text-right space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-black print:text-[9.5px]" style={{ color: BRAND }}>
                  <QrCode size={14} className="shrink-0" />
                  رمز الفاتورة الإلكترونية
                </p>
                <p className="text-[10.5px] font-bold leading-relaxed text-ink print:text-[8px] print:leading-tight">
                  امسحي الرمز بالهاتف للمعاينة ومتابعة الشحن والتوصيل.
                </p>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black print:text-[7.5px]"
                  style={{ background: SUCCESS_SOFT, color: SUCCESS }}
                >
                  <ShieldCheck size={10} />
                  نسخة رقمية موثقة
                </span>
              </div>
            </div>
          )}
        </footer>
      </div>
    </article>
  );
}
