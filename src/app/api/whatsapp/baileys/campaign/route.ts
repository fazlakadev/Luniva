import { NextResponse } from "next/server";
import { baileysManager } from "@/lib/whatsapp-baileys";
import { compileTemplate } from "@/lib/whatsapp-shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, templateContent, category } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "قائمة المستلمين فارغة" }, { status: 400 });
    }

    if (!templateContent || !templateContent.trim()) {
      return NextResponse.json({ error: "محتوى الرسالة مطلوب" }, { status: 400 });
    }

    const status = baileysManager.getStatus();
    if (status.status !== "connected") {
      return NextResponse.json({ error: "واتساب غير متصل. يرجى مسح رمز QR أولاً." }, { status: 400 });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      if (!recipient.phone) continue;

      const compiledMessage = compileTemplate(templateContent, {
        اسم_العميلة: recipient.full_name || "عزيزتي",
        إجمالي_المشتريات: recipient.total_spent ? `${recipient.total_spent} ج.م` : "",
        المبلغ_المتبقي: recipient.open_balance ? `${recipient.open_balance} ج.م` : "0 ج.م",
      });

      const res = await baileysManager.sendMessage(recipient.phone, compiledMessage);
      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Safe throttle delay to prevent WhatsApp spam flags
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: recipients.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
