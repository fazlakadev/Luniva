import Image from "next/image";
import { QrCode, ShieldCheck, Smartphone, Truck } from "lucide-react";
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
const MUTED = "#7d6c74";
const LINE = "#e8dde0";
const BRAND = "#8e445b";

export default function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  const paid = Number(invoice.paid_amount || 0);
  const total = Number(invoice.total || 0);
  const remaining = Math.max(0, total - paid);
  const discountLabel =
    invoice.discount_type === "percent"
      ? `خصم ${formatNumber(invoice.discount_value)}%`
      : discountTypeLabels[invoice.discount_type] ?? "خصم";

  const statusColor =
    invoice.status === "paid"
      ? "#3f8267"
      : invoice.status === "partial"
        ? "#a97832"
        : invoice.status === "cancelled"
          ? "#7d6c74"
          : "#b34a61";

  return (
    <article className="invoice-sheet mx-auto w-full max-w-[860px] overflow-hidden rounded-2xl" dir="rtl">
      {invoice.status === "cancelled" && (
        <div className="invoice-cancel-bar px-5 py-2 text-center text-xs font-black">فاتورة ملغاة — غير صالحة للتحصيل</div>
      )}

      <div className="p-6 sm:p-9">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-3">
            <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} className="h-14 w-14 object-contain" />
            <div>
              <p className="text-lg font-black tracking-[0.14em]" style={{ color: INK }}>{invoice.company?.companyName ?? "لونيفا"}</p>
              <p className="mt-0.5 text-[10px] font-extrabold" style={{ color: BRAND }}>{invoice.company?.companyTagline ?? "شركة ملابس نسائية مصرية"}</p>
              {(invoice.company?.companyPhone || invoice.company?.companyAddress || invoice.company?.taxNumber) && (
                <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
                  {[
                    invoice.company?.companyPhone && `هاتف: ${invoice.company.companyPhone}`,
                    invoice.company?.companyAddress && invoice.company.companyAddress,
                    invoice.company?.taxNumber && `سجل ضريبي: ${invoice.company.taxNumber}`,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="text-left">
            <p className="text-xs font-black" style={{ color: BRAND }}>فاتورة مبيعات</p>
            <p className="mono mt-1 text-xl font-black tracking-wide" dir="ltr" style={{ color: INK }}>{invoice.invoice_number}</p>
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{formatDate(invoice.created_at)}</p>
            {invoice.due_date && (
              <p className="mt-1 text-[10px]" style={{ color: MUTED }}>الاستحقاق: {formatDate(invoice.due_date)}</p>
            )}
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: `${statusColor}18`, color: statusColor }}>
                {invoiceStatusLabels[invoice.status]}
              </span>
              {invoice.deliveryStatus && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: "#edf3f8", color: "#3d6683" }}>
                  <Truck size={11} />{deliveryStatusLabels[invoice.deliveryStatus]}
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl p-4" style={{ background: "#faf5f6", border: `1px solid ${LINE}` }}>
            <p className="text-[10px] font-black tracking-[0.12em]" style={{ color: BRAND }}>فاتورة إلى</p>
            <p className="mt-2 text-sm font-black" style={{ color: INK }}>{invoice.customer_name}</p>
            {invoice.customer_phone && <p className="mono mt-1 text-[11px]" dir="ltr" style={{ color: MUTED }}>{invoice.customer_phone}</p>}
            {invoice.customer_address && <p className="mt-1 text-[11px] leading-5" style={{ color: MUTED }}>{invoice.customer_address}</p>}
            {invoice.delivery_area && <p className="mt-1 text-[11px]" style={{ color: MUTED }}>منطقة التوصيل: {invoice.delivery_area}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3" style={{ border: `1px solid ${LINE}` }}>
              <p className="text-[10px] font-bold" style={{ color: MUTED }}>طريقة الدفع</p>
              <p className="mt-1 text-[12px] font-black" style={{ color: INK }}>{paymentMethodLabels[invoice.payment_method]}</p>
            </div>
            <div className="rounded-xl p-3" style={{ border: `1px solid ${LINE}` }}>
              <p className="text-[10px] font-bold" style={{ color: MUTED }}>عدد العناصر</p>
              <p className="mt-1 text-[12px] font-black" style={{ color: INK }}>{formatNumber(invoice.items.length)} عنصر</p>
            </div>
            <div className="rounded-xl p-3" style={{ border: `1px solid ${LINE}` }}>
              <p className="text-[10px] font-bold" style={{ color: MUTED }}>المدفوع</p>
              <p className="money mt-1 text-[12px] font-black" style={{ color: "#3f8267" }}>{formatMoney(paid)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ border: `1px solid ${LINE}` }}>
              <p className="text-[10px] font-bold" style={{ color: MUTED }}>المتبقي</p>
              <p className="money mt-1 text-[12px] font-black" style={{ color: remaining > 0 ? "#b34a61" : MUTED }}>{formatMoney(remaining)}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-x-auto rounded-xl" style={{ border: `1px solid ${LINE}` }}>
          <table className="w-full min-w-[560px] border-collapse text-right">
            <thead>
              <tr style={{ background: "#f7eef0" }}>
                <th className="px-2 py-2.5 sm:px-3 text-[10px] font-black" style={{ color: BRAND }}>#</th>
                <th className="px-2 py-2.5 sm:px-3 text-[10px] font-black" style={{ color: BRAND }}>العنصر</th>
                <th className="px-2 py-2.5 sm:px-3 text-[10px] font-black" style={{ color: BRAND }}>الكود</th>
                <th className="px-2 py-2.5 sm:px-3 text-center text-[10px] font-black" style={{ color: BRAND }}>الكمية</th>
                <th className="px-2 py-2.5 sm:px-3 text-left text-[10px] font-black" style={{ color: BRAND }}>سعر الوحدة</th>
                <th className="px-2 py-2.5 sm:px-3 text-left text-[10px] font-black" style={{ color: BRAND }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const before = Number(item.unit_before || 0);
                const price = Number(item.unit_price || 0);
                return (
                  <tr key={item.id} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td className="px-2 py-3 sm:px-3 align-top text-[11px]" style={{ color: MUTED }}>{formatNumber(index + 1)}</td>
                    <td className="px-2 py-3 sm:px-3 align-top">
                      <p className="text-[12px] font-extrabold" style={{ color: INK }}>{item.name}</p>
                      {item.description && <p className="mt-0.5 max-w-[320px] text-[10px] leading-4" style={{ color: MUTED }}>{item.description}</p>}
                    </td>
                    <td className="mono px-2 py-3 sm:px-3 align-top text-[10px]" dir="ltr" style={{ color: MUTED }}>{item.sku || "—"}</td>
                    <td className="px-2 py-3 sm:px-3 text-center align-top text-[11px] font-bold" style={{ color: INK }}>{formatNumber(item.quantity)}</td>
                    <td className="px-2 py-3 sm:px-3 align-top text-left">
                      <p className="money text-[11px] font-bold" style={{ color: INK }}>{formatMoney(price)}</p>
                      {before > price && <p className="money text-[9px] line-through" style={{ color: MUTED }}>{formatMoney(before)}</p>}
                    </td>
                    <td className="money px-2 py-3 sm:px-3 align-top text-left text-[12px] font-black" style={{ color: INK }}>{formatMoney(item.line_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-[1fr_320px]">
          <div>
            {invoice.notes && (
              <div className="rounded-xl p-3.5" style={{ background: "#fbf8f9", border: `1px solid ${LINE}` }}>
                <p className="text-[10px] font-black" style={{ color: BRAND }}>ملاحظات</p>
                <p className="mt-1.5 whitespace-pre-line text-[11px] leading-5" style={{ color: MUTED }}>{invoice.notes}</p>
              </div>
            )}
            <p className="mt-3 text-[9px] leading-5" style={{ color: MUTED }}>
              الاحتفاظ بهذه الفاتورة يسهّل المتابعة والاستبدال. الأسعار مثبتة لحظة الإصدار.
            </p>
          </div>

          <div className="space-y-2 rounded-xl p-4" style={{ border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: MUTED }}>الإجمالي الفرعي</span>
              <span className="money" style={{ color: INK }}>{formatMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: MUTED }}>{discountLabel}</span>
              <span className="money" style={{ color: "#b34a61" }}>− {formatMoney(invoice.discount_amount)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: MUTED }}>رسوم التوصيل</span>
              <span className="money" style={{ color: INK }}>{formatMoney(invoice.delivery_fee)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: LINE }}>
              <span className="text-[12px] font-black" style={{ color: INK }}>الإجمالي</span>
              <span className="money text-lg font-black" style={{ color: BRAND }}>{formatMoney(invoice.total)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: MUTED }}>المدفوع</span>
              <span className="money" style={{ color: "#3f8267" }}>{formatMoney(paid)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: remaining > 0 ? "#fdeef1" : "#e9f5ef" }}>
              <span className="text-[11px] font-black" style={{ color: remaining > 0 ? "#b34a61" : "#3f8267" }}>المتبقي</span>
              <span className="money text-[12px] font-black" style={{ color: remaining > 0 ? "#b34a61" : "#3f8267" }}>{formatMoney(remaining)}</span>
            </div>
          </div>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4" style={{ borderColor: LINE, color: MUTED }}>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black" style={{ color: INK }}>
              {invoice.company?.receiptFooter ?? "شكرًا لتعاملك معنا"}
            </p>
            <p className="mt-1 text-[9px] leading-4">
              الاحتفاظ بهذه الفاتورة يسهّل المتابعة والاستبدال. الأسعار مثبتة لحظة الإصدار.
            </p>
            <p className="mono mt-2 text-[9px]" dir="ltr">
              {invoice.company?.companyName ?? "Luniva"} · {invoice.invoice_number}
            </p>
          </div>

          {invoice.qrImage && (
            <div
              className="w-full shrink-0 rounded-2xl p-3 sm:w-[268px]"
              style={{ background: "linear-gradient(135deg, #fff8f9, #fdf1f4)", border: `1px solid ${LINE}` }}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: "#f7e4e9", color: BRAND }}>
                  <QrCode size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black" style={{ color: INK }}>امسحي رمز الاستجابة السريعة</p>
                  <p className="mt-0.5 text-[8px] leading-[13px]" style={{ color: MUTED }}>
                    لمعاينة فاتورتك ومتابعة التوصيل من هاتفك.
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-3 rounded-xl bg-white p-2.5" style={{ border: `1px solid ${LINE}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={invoice.qrImage} alt={`رمز معاينة الفاتورة ${invoice.invoice_number}`} className="h-[72px] w-[72px] shrink-0 rounded-lg bg-white" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[9px] font-black" style={{ color: BRAND }}>
                    <Smartphone size={10} />فاتورتك في جيبك
                  </p>
                  <p className="mt-1 text-[8px] leading-[13px]" style={{ color: MUTED }}>
                    تفتح المعاينة وحالة التوصيل مباشرة على الهاتف.
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black" style={{ background: "#e9f5ef", color: "#3f8267" }}>
                    <ShieldCheck size={9} />رابط آمن
                  </span>
                </div>
              </div>
            </div>
          )}
        </footer>
      </div>
    </article>
  );
}
