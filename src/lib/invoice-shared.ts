export const INVOICE_STATUSES = ["unpaid", "partial", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  unpaid: "غير مدفوعة",
  partial: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export const PAYMENT_METHODS = ["cash", "card", "transfer", "wallet"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  card: "بطاقة",
  transfer: "تحويل بنكي",
  wallet: "محفظة إلكترونية",
};

export type PaymentRow = {
  id: string;
  receipt_number: string;
  invoice_id: string;
  invoice_number?: string | null;
  customer_name?: string | null;
  amount: string | number;
  payment_method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  recorded_by: string | null;
};

/** Shared by invoice creation, editing and the payments ledger. */
export function deriveInvoiceStatus(total: number, paid: number, cancelled = false): InvoiceStatus {
  if (cancelled) return "cancelled";
  const safeTotal = Math.round((Number(total) + Number.EPSILON) * 100) / 100;
  const safePaid = Math.round((Number(paid) + Number.EPSILON) * 100) / 100;
  if (safePaid <= 0) return "unpaid";
  if (safePaid + 0.001 >= safeTotal) return "paid";
  return "partial";
}

export function daysOverdue(dueDate: string | null | undefined, status?: InvoiceStatus) {
  if (!dueDate || status === "paid" || status === "cancelled") return 0;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

export function agingBucket(days: number) {
  if (days <= 0) return "current";
  if (days <= 15) return "1-15";
  if (days <= 30) return "16-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export const agingLabels: Record<string, string> = {
  current: "غير متأخر",
  "1-15": "١–١٥ يوم",
  "16-30": "١٦–٣٠ يوم",
  "31-60": "٣١–٦٠ يوم",
  "60+": "أكثر من ٦٠ يوم",
};
