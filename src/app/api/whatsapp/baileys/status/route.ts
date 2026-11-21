import { NextResponse } from "next/server";
import { baileysManager } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = baileysManager.getStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
