const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function uploadImage(photo: FormDataEntryValue | null) {
  if (!(photo instanceof File) || photo.size === 0) return null;
  if (!photo.type.startsWith("image/") || photo.size > MAX_IMAGE_SIZE) {
    throw new Error("اختر صورة صالحة بحجم لا يتجاوز 5 MB.");
  }
  const imageKey = process.env.IMGBB_API_KEY;
  if (!imageKey) throw new Error("إعداد رفع الصور غير مكتمل.");

  const upload = new FormData();
  upload.append("image", Buffer.from(await photo.arrayBuffer()).toString("base64"));
  const uploadResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imageKey}`, {
    method: "POST",
    body: upload,
    cache: "no-store",
  });
  const uploadData = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadData?.success) throw new Error("تعذر رفع الصورة، حاول مرة أخرى.");
  return uploadData.data.url as string;
}
