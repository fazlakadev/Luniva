import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteWhatsAppTemplate,
  getWhatsAppTemplates,
  saveWhatsAppTemplate,
  type WhatsAppTemplateCategory,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function GET() {
  try {
    const templates = await getWhatsAppTemplates();
    return NextResponse.json({ success: true, ok: true, templates });
  } catch (error) {
    console.error("Failed to fetch whatsapp templates", error);
    return NextResponse.json(
      { success: false, ok: false, error: "تعذر جلب قوالب الواتساب." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = (await request.json()) as {
      id?: string;
      category: WhatsAppTemplateCategory;
      name: string;
      content: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, ok: false, error: "اسم القالب مطلوب." }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ success: false, ok: false, error: "نص القالب مطلوب." }, { status: 400 });
    }

    const template = await saveWhatsAppTemplate({
      id: body.id,
      category: body.category || "custom",
      name: body.name,
      content: body.content,
    });

    return NextResponse.json({ success: true, ok: true, template });
  } catch (error) {
    console.error("Failed to save whatsapp template", error);
    return NextResponse.json({ success: false, ok: false, error: "تعذر حفظ القالب." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, ok: false, error: "معرف القالب مطلوب." }, { status: 400 });
    }

    const deleted = await deleteWhatsAppTemplate(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, ok: false, error: "لا يمكن حذف القوالب الأساسية الافتراضية للنظام." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ok: true });
  } catch (error) {
    console.error("Failed to delete whatsapp template", error);
    return NextResponse.json({ success: false, ok: false, error: "تعذر حذف القالب." }, { status: 500 });
  }
}
