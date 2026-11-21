import { NextResponse } from "next/server";
import { db, ensureWhatsAppTables } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureWhatsAppTables();
    const res = await db.query(
      "SELECT is_auto_reply_enabled, welcome_message, order_notification_enabled, invoice_auto_send FROM whatsapp_bot_settings WHERE id = 'default'",
    );
    const settings = res.rows[0] || {
      is_auto_reply_enabled: false,
      welcome_message: "أهلاً بكِ في لونيفا (Luniva) للأزياء ✨ نسعد بخدمتك دائماً. سيتواصل معكِ أحد ممثلينا في أقرب وقت 💕",
      order_notification_enabled: true,
      invoice_auto_send: true,
    };
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { is_auto_reply_enabled, welcome_message, order_notification_enabled, invoice_auto_send } = body;

    await ensureWhatsAppTables();
    await db.query(
      `INSERT INTO whatsapp_bot_settings (id, is_auto_reply_enabled, welcome_message, order_notification_enabled, invoice_auto_send, updated_at)
       VALUES ('default', $1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         is_auto_reply_enabled = EXCLUDED.is_auto_reply_enabled,
         welcome_message = EXCLUDED.welcome_message,
         order_notification_enabled = EXCLUDED.order_notification_enabled,
         invoice_auto_send = EXCLUDED.invoice_auto_send,
         updated_at = NOW()`,
      [
        Boolean(is_auto_reply_enabled),
        welcome_message?.trim() || "أهلاً بكِ في لونيفا (Luniva) للأزياء ✨",
        order_notification_enabled !== undefined ? Boolean(order_notification_enabled) : true,
        invoice_auto_send !== undefined ? Boolean(invoice_auto_send) : true,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
