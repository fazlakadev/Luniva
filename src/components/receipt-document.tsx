import Image from "next/image";
import { formatDate, formatMoney } from "@/lib/format";
import { paymentMethodLabels, type PaymentMethod } from "@/lib/invoice-shared";
import type { CompanySettings } from "@/lib/settings";

export type ReceiptData = {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  amount: string | number;
  payment_method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  recorded_by: string | null;
  invoice_total: string | number;
  invoice_paid: string | number;
  due_date: string | null;
};

const INK = "#2b2228";
const MUTED = "#7d6c74";
const LINE = "#e8dde0";
const BRAND = "#8e445b";

export default function ReceiptDocument({ receipt, settings }: { receipt: ReceiptData; settings: CompanySettings }) {
  const total = Number(receipt.invoice_total || 0);
  const paid = Number(receipt.invoice_paid || 0);
  const remaining = Math.max(0, Math.round((total - paid + Number.EPSILON) * 100) / 100);

  return (
    <article className="invoice-sheet mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl" dir="rtl">
      <div className="p-6 sm:p-9">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-3">
            <Image src="/luniva-logo-v2.png" alt="شعار لونيفا" width={128} height={128} className="h-14 w-14 object-contain" />
            <div>
              <p className="text-lg font-black tracking-[0.14em]" style={{ color: INK }}>{settings.companyName}</p>
              <p className="mt-0.5 text-[10px] font-extrabold" style={{ color: BRAND }}>{settings.companyTagline}</p>
              {(settings.companyPhone || settings.taxNumber) && (
                <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
                  {[settings.companyPhone && `هاتف: ${settings.companyPhone}`, settings.taxNumber && `سجل ضريبي: ${settings.taxNumber}`].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs font-black" style={{ color: BRAND }}>إيصال تحصيل</p>
            <p className="mono mt-1 text-lg font-black tracking-wide" dir="ltr" style={{ color: INK }}>{receipt.receipt_number}</p>
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{formatDate(receipt.paid_at)}</p>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl p-4" style={{ background: "#faf5f6", border: `1px solid ${LINE}` }}>
            <p className="text-[10px] font-black tracking-[0.12em]" style={{ color: BRAND }}>استلمنا من</p>
            <p className="mt-2 text-sm font-black" style={{ color: INK }}>{receipt.customer_name || "عميلة نقدية"}</p>
            {receipt.customer_phone && <p className="mono mt-1 text-[11px]" dir="ltr" style={{ color: MUTED }}>{receipt.customer_phone}</p>}
            {receipt.customer_address && <p className="mt-1 text-[11px] leading-5" style={{ color: MUTED }}>{receipt.customer_address}</p>}
          </div>
          <div className="rounded-xl p-4" style={{ border: `1px solid ${LINE}` }}>
            <p className="text-[10px] font-black tracking-[0.12em]" style={{ color: BRAND }}>تفاصيل الدفعة</p>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>الفاتورة</span>
                <span className="mono font-black" dir="ltr" style={{ color: INK }}>{receipt.invoice_number}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: MUTED }}>الطريقة</span>
                <span className="font-black" style={{ color: INK }}>{paymentMethodLabels[receipt.payment_method] ?? receipt.payment_method}</span>
              </div>
              {receipt.reference && (
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: MUTED }}>المرجع</span>
                  <span className="mono font-black" dir="ltr" style={{ color: INK }}>{receipt.reference}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, #f7eef0, #fbf8f9)", border: `1px solid ${LINE}` }}>
          <p className="text-[11px] font-black" style={{ color: BRAND }}>مبلغ التحصيل</p>
          <p className="money mt-2 text-3xl font-black" style={{ color: INK }}>{formatMoney(receipt.amount)}</p>
          <p className="mt-1 text-[10px]" style={{ color: MUTED }}>{receipt.notes || "—"}</p>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: "إجمالي الفاتورة", value: total },
            { label: "إجمالي المحصّل", value: paid },
            { label: "المتبقي", value: remaining },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ border: `1px solid ${LINE}` }}>
              <p className="text-[10px]" style={{ color: MUTED }}>{label}</p>
              <p className="money mt-1 text-[12px] font-black" style={{ color: INK }}>{formatMoney(value)}</p>
            </div>
          ))}
        </section>

        <footer className="mt-8 grid gap-5 border-t pt-4 text-[10px]" style={{ borderColor: LINE, color: MUTED }}>
          <div className="flex items-center justify-between gap-4">
            <span>الاستلام: ........................................</span>
            <span>المحصِّل: {receipt.recorded_by || "—"}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{settings.receiptFooter}</span>
            <span className="mono" dir="ltr">{settings.companyName} · {receipt.receipt_number}</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
