/** Appointment types, labels and validators shared by server routes and client UI. */

export const APPOINTMENT_TONES = ["accent", "success", "warning", "danger", "info", "neutral"] as const;
export type AppointmentTone = (typeof APPOINTMENT_TONES)[number];

export const APPOINTMENT_KINDS = ["followup", "payment", "delivery", "meeting"] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const APPOINTMENT_STATUSES = ["pending", "done", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const appointmentKindLabels: Record<AppointmentKind, string> = {
  followup: "متابعة",
  payment: "تحصيل دفعة",
  delivery: "تسليم طلب",
  meeting: "اجتماع",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "قيد الانتظار",
  done: "تم",
  cancelled: "ملغي",
};

export const appointmentToneLabels: Record<AppointmentTone, string> = {
  accent: "وردي",
  success: "أخضر",
  warning: "برتقالي",
  danger: "أحمر",
  info: "بنفسجي",
  neutral: "رمادي",
};

export const appointmentStatusClass: Record<AppointmentStatus, string> = {
  pending: "badge-warning",
  done: "badge-success",
  cancelled: "badge-muted",
};

export type AppointmentRecord = {
  id: string;
  title: string;
  notes: string | null;
  appointment_date: string;
  appointment_time: string | null;
  tone: AppointmentTone;
  kind: AppointmentKind;
  status: AppointmentStatus;
  customer_id: string | null;
  invoice_id: string | null;
  customer_name: string | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeTone(value: unknown): AppointmentTone {
  return APPOINTMENT_TONES.includes(value as AppointmentTone) ? (value as AppointmentTone) : "accent";
}

export function normalizeKind(value: unknown): AppointmentKind {
  return APPOINTMENT_KINDS.includes(value as AppointmentKind) ? (value as AppointmentKind) : "followup";
}

export function normalizeStatus(value: unknown): AppointmentStatus {
  return APPOINTMENT_STATUSES.includes(value as AppointmentStatus) ? (value as AppointmentStatus) : "pending";
}

/** Accepts `YYYY-MM-DD` and rejects impossible calendar dates such as 2026-02-31. */
export function normalizeDateOnly(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return null;
  return text;
}

/** Accepts `HH:MM` in 24-hour form. */
export function normalizeTimeOnly(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

/** Turns a database `YYYY-MM-DD` value into a local Date without timezone drift. */
export function parseAppointmentDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function isPastPending(record: AppointmentRecord): boolean {
  return record.status === "pending" && record.appointment_date < todayKey();
}

export function isToday(record: AppointmentRecord): boolean {
  return record.appointment_date === todayKey();
}

export function sortAppointments(records: AppointmentRecord[]): AppointmentRecord[] {
  return [...records].sort((a, b) => {
    if (a.appointment_date !== b.appointment_date) return a.appointment_date.localeCompare(b.appointment_date);
    return (a.appointment_time ?? "").localeCompare(b.appointment_time ?? "");
  });
}
