import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  formatWhatsAppPhone,
  generateWhatsAppUrl,
  logWhatsAppDispatch,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = (await request.json()) as {
      customerId?: string;
      customerName?: string;
      phone: string;
      message: string;
      templateCategory?: string;
      sentBy?: string;
      preferWeb?: boolean;
    };

    if (!body.phone?.trim()) {
      return NextResponse.json(
        { success: false, ok: false, error: "رقم هاتف العميلة مطلوب." },
        { status: 400 }
      );
    }
    if (!body.message?.trim()) {
      return NextResponse.json(
        { success: false, ok: false, error: "محتوى الرسالة مطلوب." },
        { status: 400 }
      );
    }

    const cleanPhone = formatWhatsAppPhone(body.phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, ok: false, error: "رقم الهاتف غير صالح للإرسال. تأكدي من كتابة رقم صحيح." },
        { status: 400 }
      );
    }

    const url = generateWhatsAppUrl(cleanPhone, body.message, body.preferWeb ?? false);

    // Record in dispatch log safely
    const log = await logWhatsAppDispatch({
      customerId: body.customerId || null,
      customerName: body.customerName || null,
      phone: cleanPhone,
      templateCategory: body.templateCategory || "custom",
      message: body.message,
      sentBy: session?.name || body.sentBy || "المسؤول",
    });

    return NextResponse.json({
      success: true,
      ok: true,
      url,
      phone: cleanPhone,
      formattedPhone: cleanPhone,
      log,
    });
  } catch (error) {
    console.error("Failed to generate and log whatsapp send", error);
    return NextResponse.json(
      { success: false, ok: false, error: "تعذر تسجيل إرسال الواتساب." },
      { status: 500 }
    );
  }
}
