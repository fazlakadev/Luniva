import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  formatWhatsAppPhone,
  generateWhatsAppUrl,
  logWhatsAppDispatch,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      customerId?: string;
      customerName?: string;
      phone: string;
      message: string;
      templateCategory?: string;
      preferWeb?: boolean;
    };

    if (!body.phone?.trim()) {
      return NextResponse.json({ error: "رقم هاتف العميلة مطلوب." }, { status: 400 });
    }
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "محتوى الرسالة مطلوب." }, { status: 400 });
    }

    const cleanPhone = formatWhatsAppPhone(body.phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json({ error: "رقم الهاتف غير صالح للإرسال." }, { status: 400 });
    }

    const url = generateWhatsAppUrl(cleanPhone, body.message, body.preferWeb ?? false);

    // Record in dispatch log
    const log = await logWhatsAppDispatch({
      customerId: body.customerId,
      customerName: body.customerName,
      phone: cleanPhone,
      templateCategory: body.templateCategory || "custom",
      message: body.message,
      sentBy: session.name,
    });

    return NextResponse.json({
      ok: true,
      url,
      phone: cleanPhone,
      log,
    });
  } catch (error) {
    console.error("Failed to generate and log whatsapp send", error);
    return NextResponse.json({ error: "تعذر معالجة إرسال الواتساب." }, { status: 500 });
  }
}
