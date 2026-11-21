import { NextResponse } from "next/server";
import { getBaileysChats } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const q = searchParams.get("q")?.toLowerCase().trim();

    let chats = await getBaileysChats(filter);
    if (q) {
      chats = chats.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
          (c.last_message && c.last_message.toLowerCase().includes(q)),
      );
    }

    return NextResponse.json(chats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
