import { NextResponse } from "next/server";
import { getBaileysMessages, markChatAsRead } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jid = searchParams.get("jid");
    if (!jid) {
      return NextResponse.json({ error: "معرف المحادثة (jid) مطلوب" }, { status: 400 });
    }

    const messages = await getBaileysMessages(jid);
    await markChatAsRead(jid);

    return NextResponse.json(messages);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
