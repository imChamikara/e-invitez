/** Client-side image compression: longest edge ≤ 1600px, WebP (JPEG fallback). */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.78): Promise<{ blob: Blob; type: string; ext: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, type: "image/webp", ext: "webp" };
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Could not compress image");
  return { blob: jpeg, type: "image/jpeg", ext: "jpg" };
}
