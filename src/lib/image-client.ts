/**
 * Lightweight browser-side image optimizer. Product photos are uploaded with
 * FormData; sending multi-megabyte originals can trip the host body limit and
 * produce a plain-text 413 response. Downscaling before upload keeps requests
 * small while preserving the images the customer sees.
 */
const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.78;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight, 1));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    // White background keeps transparent PNGs from turning black as JPEGs.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas);
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    // Rare browsers / SVG files: keep the original and let the server validate it.
    return file;
  }
}
