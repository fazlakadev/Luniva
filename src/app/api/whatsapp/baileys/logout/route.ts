import { NextResponse } from "next/server";
import { baileysManager } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";

export async function POST() {
  try {
    await baileysManager.logout();
    return NextResponse.json({ success: true, status: "disconnected" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
