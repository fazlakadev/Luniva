import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteNewsletterSubscriber,
  getNewsletterCampaigns,
  getNewsletterSubscribers,
} from "@/lib/newsletter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const [subscribers, campaigns] = await Promise.all([
      getNewsletterSubscribers(search),
      getNewsletterCampaigns(),
    ]);

    return NextResponse.json({
      ok: true,
      subscribers,
      campaigns,
      stats: {
        total: subscribers.length,
        active: subscribers.filter((s) => s.status === "active").length,
        campaignsCount: campaigns.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch newsletter data:", error);
    return NextResponse.json({ ok: false, error: "تعذر تحميل بيانات النشرة البريدية." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "معرف المشترك مطلوب." }, { status: 400 });
    }

    await deleteNewsletterSubscriber(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete subscriber:", error);
    return NextResponse.json({ ok: false, error: "تعذر حذف المشترك." }, { status: 500 });
  }
}
