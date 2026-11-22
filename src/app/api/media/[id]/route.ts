import { NextResponse } from "next/server";
import { getMediaById } from "@/lib/media-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return new Response("Missing media id", { status: 400 });
    }

    const media = await getMediaById(id);
    if (!media) {
      return new Response("Media not found", { status: 404 });
    }

    return new Response(new Uint8Array(media.data), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(media.fileName)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
}
