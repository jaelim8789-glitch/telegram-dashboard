export async function resizeImage(file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof document === 'undefined') return file;

  const img = await createImageBitmap(file);
  let { width, height } = img;
  if (width <= maxWidth && height <= maxHeight) {
    img.close();
    return file;
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  img.close();

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}
