import { NextResponse } from "next/server";
import { baileysManager } from "@/lib/whatsapp-baileys";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const to = formData.get("to") as string;
      const text = (formData.get("text") as string) || "";
      const file = formData.get("file") as File | null;

      if (!to) {
        return NextResponse.json({ error: "رقم المستلم مطلوب" }, { status: 400 });
      }

      let mediaFile;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimetype = file.type || "application/octet-stream";

        let mediaType: "image" | "video" | "audio" | "document" = "document";
        if (mimetype.startsWith("image/")) mediaType = "image";
        else if (mimetype.startsWith("video/")) mediaType = "video";
        else if (mimetype.startsWith("audio/")) mediaType = "audio";

        mediaFile = {
          buffer,
          mimetype,
          type: mediaType,
          fileName: file.name,
        };
      }

      const result = await baileysManager.sendMessage(to, text, mediaFile);
      if (!result.success) {
        return NextResponse.json({ error: result.error || "فشل إرسال الملف عبر واتساب" }, { status: 500 });
      }

      return NextResponse.json({ success: true, messageId: result.messageId });
    }

    // Standard JSON body
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
