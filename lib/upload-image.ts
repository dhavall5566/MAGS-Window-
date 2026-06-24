export type ImageUploadResult = {
  url: string;
  fileId?: string;
  filePath?: string;
  thumbnailUrl?: string;
};

export async function uploadProfileImage(
  file: File,
  folder = "/mags/profiles"
): Promise<ImageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/uploads/image", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload.detail === "string"
        ? payload.detail
        : payload.error ?? "Image upload failed";
    throw new Error(message);
  }

  if (!payload.url) {
    throw new Error("Upload succeeded but no image URL was returned");
  }

  return payload as ImageUploadResult;
}
