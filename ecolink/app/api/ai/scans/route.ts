import { NextResponse } from "next/server";

import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import {
  analyzeImageWithOpenRouter,
  type AiScannerInference,
} from "@/lib/services/ai-scanner-inference";
import {
  AiScannerProviderError,
  AiScannerRequestError,
} from "@/lib/services/ai-scanner-errors";
import { normalizeAiScanResult } from "@/lib/services/ai-scanner-normalization";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function readImageFromRequest(request: Request, maxBytes: number): Promise<File> {
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

  if (files.length !== 1 || files[0]?.[0] !== "image" || formData.getAll("image").length !== 1) {
    throw new AiScannerRequestError("Exactly one image file is required in the image field.");
  }

  const file = files[0][1];

  if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new AiScannerRequestError("Image must be JPEG, PNG, or WebP.");
  }

  if (file.size === 0) {
    throw new AiScannerRequestError("The image file is empty.");
  }

  if (file.size > maxBytes) {
    throw new AiScannerRequestError("The image exceeds the maximum upload size.");
  }

  return file;
}

export async function handleAiScanRequest(
  request: Request,
  dependencies: {
    config?: AiScannerConfig;
  } = {},
) {
  try {
    const config = dependencies.config ?? {
      openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
      model: process.env.AI_SCANNER_MODEL ?? "",
      maxUploadMb: Number(process.env.AI_SCANNER_MAX_UPLOAD_MB ?? 10),
    };

    if (!config.openRouterApiKey || !config.model || !Number.isFinite(config.maxUploadMb) || config.maxUploadMb <= 0) {
      throw new Error("AI scanner environment configuration is invalid.");
    }

    const file = await readImageFromRequest(request, config.maxUploadMb * 1024 * 1024);

    const providerOutput = await analyzeImageWithOpenRouter(
      file,
      config,
    );

    return NextResponse.json(normalizeAiScanResult(providerOutput), { status: 200 });
  } catch (error) {
    if (error instanceof AiScannerRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AiScannerProviderError) {
      console.error("AI scanner provider failure", error.providerCause ?? error);
      return NextResponse.json(
        { error: error.message, code: error.code, reason: error.reason },
        { status: 502 },
      );
    }

    console.error("AI scanner request failed", error);
    return NextResponse.json({ error: "The scan could not be processed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleAiScanRequest(request);
}
