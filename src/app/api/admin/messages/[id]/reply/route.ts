import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { replyToContactMessage } from "@/lib/messages";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { replyMessage } = body;
    if (!replyMessage?.trim()) {
      return NextResponse.json({ error: "نص الرد مطلوب." }, { status: 400 });
    }

    const updated = await replyToContactMessage(id, replyMessage, session.name || "فريق لونيفا");
    return NextResponse.json({ ok: true, message: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "تعذر إرسال الرد.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
