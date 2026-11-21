import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getNotifications,
  markNotificationAsRead,
  createNotification,
  syncSystemNotifications,
  type NotificationCategory,
  type NotificationSeverity,
} from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 30;

    // Trigger background sync for stock and appointment alerts
    syncSystemNotifications().catch((err) => console.error("Notification sync error:", err));

    const data = await getNotifications({ category, unreadOnly, limit });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unable to load notifications", error);
    return NextResponse.json({ error: "تعذر تحميل الإشعارات." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "معرف الإشعار مطلوب." }, { status: 400 });
    }

    const result = await markNotificationAsRead(body.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unable to mark notification as read", error);
    return NextResponse.json({ error: "تعذر تحديث الإشعار." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      category?: NotificationCategory;
      type?: string;
      title?: string;
      message?: string;
      link?: string;
      severity?: NotificationSeverity;
    };

    if (!body.category || !body.title || !body.message) {
      return NextResponse.json({ error: "البيانات الأساسية للإشعار غير مكتملة." }, { status: 400 });
    }

    const notification = await createNotification({
      category: body.category,
      type: body.type || `${body.category}.manual`,
      title: body.title,
      message: body.message,
      link: body.link,
      severity: body.severity,
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Unable to create notification", error);
    return NextResponse.json({ error: "تعذر إنشاء الإشعار." }, { status: 500 });
  }
}
