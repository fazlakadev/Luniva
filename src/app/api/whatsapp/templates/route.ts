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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const templates = await getWhatsAppTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to fetch whatsapp templates", error);
    return NextResponse.json({ error: "تعذر جلب قوالب الواتساب." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      id?: string;
      category: WhatsAppTemplateCategory;
      name: string;
      content: string;
    };

    if (!body.name?.trim()) return NextResponse.json({ error: "اسم القالب مطلوب." }, { status: 400 });
    if (!body.content?.trim()) return NextResponse.json({ error: "نص القالب مطلوب." }, { status: 400 });

    const template = await saveWhatsAppTemplate({
      id: body.id,
      category: body.category || "custom",
      name: body.name,
      content: body.content,
    });

    return NextResponse.json({ ok: true, template });
  } catch (error) {
    console.error("Failed to save whatsapp template", error);
    return NextResponse.json({ error: "تعذر حفظ القالب." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "معرّف القالب مطلوب." }, { status: 400 });

    const deleted = await deleteWhatsAppTemplate(id);
    if (!deleted) return NextResponse.json({ error: "لا يمكن حذف القوالب الافتراضية." }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete whatsapp template", error);
    return NextResponse.json({ error: "تعذر حذف القالب." }, { status: 500 });
  }
}
