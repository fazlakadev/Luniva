import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { getSettings, normalizeSettingsPayload, saveSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    return NextResponse.json({ settings: await getSettings() });
  } catch (error) {
    console.error("Unable to load settings", error);
    return NextResponse.json({ error: "تعذر تحميل الإعدادات." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveSettings(normalizeSettingsPayload(body));
    await logActivity({
      entityType: "settings",
      entityId: "company",
      action: "settings.updated",
      summary: "تحديث بيانات الشركة وإعدادات الفواتير",
      actor: session.name,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Unable to save settings", error);
    const message = error instanceof Error ? error.message : "تعذر حفظ الإعدادات.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
