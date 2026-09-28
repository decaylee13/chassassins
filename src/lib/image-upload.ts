import "server-only";

/**
 * Safety images are stored as base64 data URIs directly in the `days` row
 * — no external blob storage/credentials needed. Fine at this scale (a
 * handful of images per round); would need revisiting if that changed.
 */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB raw file
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export type ImageResult = { dataUri: string } | { error: string } | { dataUri: null };

/** Reads a `File` from FormData into a data URI. Returns `{ dataUri: null }` if no file was provided. */
export async function fileFieldToDataUri(formData: FormData, fieldName: string): Promise<ImageResult> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) {
    return { dataUri: null };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Image must be a PNG, JPEG, WEBP, or GIF." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `Image must be smaller than ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { dataUri: `data:${file.type};base64,${buffer.toString("base64")}` };
}
