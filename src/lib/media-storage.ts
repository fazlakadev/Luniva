import { db, ensureMediaTable } from "@/lib/db";

export async function saveMedia(input: {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
}): Promise<string> {
  const { buffer, mimeType, fileName } = input;

  // 1. If it's an image and IMGBB_API_KEY is available, upload to ImgBB CDN first
  if (mimeType.startsWith("image/") && process.env.IMGBB_API_KEY) {
    try {
      const upload = new FormData();
      upload.append("image", buffer.toString("base64"));
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
        method: "POST",
        body: upload,
      });
      const data = await res.json();
      if (res.ok && data?.success && data?.data?.url) {
        return data.data.url;
      }
    } catch {
      // fallback to database BYTEA
    }
  }

  // 2. Persistent storage in PostgreSQL app_media
  await ensureMediaTable();
  const res = await db.query(
    `INSERT INTO app_media (file_name, mime_type, data, size_bytes)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [fileName || "media", mimeType, buffer, buffer.length],
  );

  return `/api/media/${res.rows[0].id}`;
}

export async function getMediaById(id: string): Promise<{ data: Buffer; mimeType: string; fileName: string } | null> {
  try {
    await ensureMediaTable();
    const res = await db.query(
      "SELECT file_name, mime_type, data FROM app_media WHERE id = $1",
      [id],
    );
    if (!res.rowCount || !res.rows[0]) return null;

    return {
      data: res.rows[0].data,
      mimeType: res.rows[0].mime_type,
      fileName: res.rows[0].file_name || "file",
    };
  } catch {
    return null;
  }
}
