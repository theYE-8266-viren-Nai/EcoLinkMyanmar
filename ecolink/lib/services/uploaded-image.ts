import { AiScannerRequestError } from "@/lib/services/ai-scanner-errors";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function detectImageType(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function readSingleImageFromMultipartRequest(
  request: Request,
  maxBytes: number,
  fieldName = "image",
): Promise<{ file: File; formData: FormData }> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data;")) {
    throw new AiScannerRequestError("Content-Type must be multipart/form-data.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new AiScannerRequestError("The multipart request body is malformed.");
  }

  const files = Array.from(formData.entries()).filter(
    (entry): entry is [string, File] => entry[1] instanceof File,
  );

  if (files.length !== 1 || files[0]?.[0] !== fieldName || formData.getAll(fieldName).length !== 1) {
    throw new AiScannerRequestError(`Exactly one image file is required in the ${fieldName} field.`);
  }

  let file = files[0][1];

  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    const detectedType = await detectImageType(file);
    if (!detectedType) {
      throw new AiScannerRequestError("Image must be JPEG, PNG, or WebP.");
    }

    file = new File([file], file.name, {
      type: detectedType,
      lastModified: file.lastModified,
    });
  }

  if (file.size === 0) {
    throw new AiScannerRequestError("The image file is empty.");
  }

  if (file.size > maxBytes) {
    throw new AiScannerRequestError("The image exceeds the maximum upload size.");
  }

  return { file, formData };
}
