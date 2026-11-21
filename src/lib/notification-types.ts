export type NotificationCategory = "sales" | "inventory" | "appointment" | "system";
export type NotificationSeverity = "info" | "warning" | "success" | "danger";

export type NotificationRecord = {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  severity: NotificationSeverity;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
