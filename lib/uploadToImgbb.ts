/**
 * Helper to upload image files to ImgBB using the provided API key
 */
export async function uploadToImgbb(file: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "1705736b8f2b46dcbaeec8a6025aca83";
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();

  if (!res.ok || !json?.success) {
    const errorMsg = json?.error?.message || "فشل رفع الصورة";
    throw new Error(errorMsg);
  }

  return json.data.url;
}
