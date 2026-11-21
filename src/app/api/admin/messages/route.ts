import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listContactMessages } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";

  const messages = await listContactMessages(status);
  return NextResponse.json({ ok: true, messages });
}
