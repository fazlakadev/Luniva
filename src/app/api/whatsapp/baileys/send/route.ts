import { NextResponse } from "next/server";
import { baileysManager } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, text } = body;

    if (!to || !text || !text.trim()) {
      return NextResponse.json({ error: "رقم المستلم والرسالة مطلوبان" }, { status: 400 });
    }

    const result = await baileysManager.sendMessage(to, text.trim());
    if (!result.success) {
      return NextResponse.json({ error: result.error || "فشل إرسال الرسالة عبر واتساب" }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
