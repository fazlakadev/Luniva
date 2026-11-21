import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendNewsletterCampaign } from "@/lib/newsletter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { subject, previewText, content } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ ok: false, error: "عنوان موضوع النشرة البريدية مطلوب." }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ ok: false, error: "نص ومحتوى النشرة البريدية مطلوب." }, { status: 400 });
    }

    const result = await sendNewsletterCampaign({
      subject: subject.trim(),
      previewText: previewText?.trim(),
      content: content.trim(),
      sentBy: session.name || "إدارة لونيفا",
    });

    return NextResponse.json({
      ok: true,
      message: `تم إرسال النشرة البريدية بنجاح إلى (${result.count}) مشتركة نشطة!`,
      campaignId: result.campaignId,
      count: result.count,
    });
  } catch (error) {
    console.error("Failed to send newsletter campaign:", error);
    const msg = error instanceof Error ? error.message : "تعذر إرسال النشرة البريدية.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
