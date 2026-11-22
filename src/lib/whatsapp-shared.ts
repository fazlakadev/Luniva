import { formatMoney } from "@/lib/format";

export type WhatsAppTemplateCategory =
  | "invoice"
  | "payment"
  | "appointment"
  | "overdue"
  | "marketing"
  | "winback"
  | "custom";

export const templateCategoryLabels: Record<WhatsAppTemplateCategory, string> = {
  invoice: "فاتورة جديدة",
  payment: "إيصال سداد",
  appointment: "تذكير موعد",
  overdue: "تنبيه رصيد متبقي",
  marketing: "حملة تسويقية",
  winback: "استرجاع عميلة",
  custom: "مخصص",
};

export type WhatsAppTemplate = {
  id: string;
  category: WhatsAppTemplateCategory;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type WhatsAppLogEntry = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  phone: string;
  template_category: string | null;
  message: string;
  status: string;
  sent_by: string | null;
  created_at: string;
};

export type BroadcastCustomer = {
  id: string;
  full_name: string;
  phone: string;
  total_spent: number;
  invoices_count: number;
  open_balance: number;
  last_order_date: string | null;
};

/**
 * Normalizes any phone number into international WhatsApp format.
 * For Egyptian numbers (01xxxxxxxxx) converts to 201xxxxxxxxx.
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/[^\d]/g, "");

  // If local Egyptian number starting with 01
  if (digits.startsWith("01") && digits.length === 11) {
    digits = "2" + digits; // turns 010... into 2010...
  }

  // If begins with double zeros 0020...
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  return digits;
}

/**
 * Builds the official 100% free WhatsApp deep-link.
 * When tapped on mobile it immediately launches the WhatsApp app.
 * On desktop it launches WhatsApp Web or WhatsApp Desktop.
 */
export function generateWhatsAppUrl(phone: string, text: string, preferWeb = false): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(text);
  if (preferWeb) {
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

/**
 * Compiles a message template with dynamic customer & invoice tags.
 */
export function compileTemplate(
  content: string,
  variables: Record<string, string | number | undefined | null>,
): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const stringVal = value !== undefined && value !== null ? String(value) : "";
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, stringVal);
  }

  return result;
}

export type WhatsAppConnectionStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export type WhatsAppSessionInfo = {
  status: WhatsAppConnectionStatus;
  qrCode: string | null;
  user: {
    id: string;
    name?: string;
    phone?: string;
  } | null;
  connectedAt: string | null;
  lastError: string | null;
};

export type WhatsAppChat = {
  id?: string;
  jid: string;
  name: string | null;
  phone: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  customer_code?: string | null;
  customer_balance?: number;
  image_url?: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
};

export type WhatsAppMessage = {
  id: string;
  chat_jid: string;
  message_id: string;
  from_me: boolean;
  sender_jid: string | null;
  sender_name: string | null;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | "audio" | "document" | null;
  status: "pending" | "sent" | "delivered" | "read" | "failed" | "received";
  customer_id: string | null;
  created_at: string;
};

export type WhatsAppBotSettings = {
  is_auto_reply_enabled: boolean;
  welcome_message: string;
  is_night_mode_enabled: boolean;
  night_start_time: string;
  night_end_time: string;
  night_message: string;
  always_reply_night: boolean;
  order_notification_enabled: boolean;
  invoice_auto_send: boolean;
};

