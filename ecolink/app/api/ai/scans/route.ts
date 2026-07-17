import { NextResponse } from "next/server";

import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import { readSingleImageFromMultipartRequest } from "@/lib/services/uploaded-image";
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

async function readImageFromRequest(request: Request, maxBytes: number): Promise<File> {
  const { file } = await readSingleImageFromMultipartRequest(request, maxBytes);
  return file;
}

export async function handleAiScanRequest(
  request: Request,
  dependencies: {
    config?: AiScannerConfig;
    analyzeImage?: AiScannerInference;
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

    const analyzeImage = dependencies.analyzeImage ?? analyzeImageWithOpenRouter;
    const providerOutput = await analyzeImage(file, config);

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

/**
 * Analyze a recyclable-items image
 * @summary Analyze a recyclable-items image
 * @description Accepts exactly one JPEG, PNG, or WebP image up to the configured upload limit. The image and result are not persisted.
 * @tag AI Scanner
 * @body AiScanRequestBodySchema
 * @contentType multipart/form-data
 * @response 200:AiScanResponseSchema:Normalized image analysis.
 * @add 400:ErrorResponseSchema:Invalid multipart request or image.
 * @add 500:ErrorResponseSchema:Internal processing failure.
 * @add 502:AiProviderErrorResponseSchema:Vision provider failure or unusable provider output.
 * @openapi
 */
export async function POST(request: Request) {
  return handleAiScanRequest(request);
}
