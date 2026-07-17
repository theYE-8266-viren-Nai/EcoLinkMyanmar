import { NextResponse } from "next/server";
import { z } from "zod";

import { createEnvironmentReportSubmissionSchema } from "@/features/environment-reports/schemas/environment-report";
import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import {
  AiScannerProviderError,
  AiScannerRequestError,
  toAiScannerProviderError,
} from "@/lib/services/ai-scanner-errors";
import type { EnvironmentReportRatingInference } from "@/lib/services/environment-report-rating";
import { readSingleImageFromMultipartRequest } from "@/lib/services/uploaded-image";

export interface EnvironmentReportHandlerDependencies {
  aiConfig?: AiScannerConfig;
  rateEnvironmentImage?: EnvironmentReportRatingInference;
}

function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: "The request is invalid.",
      details: z.flattenError(error),
    },
    { status: 400 },
  );
}

function readEnvironmentReportConfig(config?: AiScannerConfig): AiScannerConfig {
  if (config) return config;

  return {
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
    model: process.env.AI_ENVIRONMENT_REPORT_MODEL ?? process.env.AI_SCANNER_MODEL ?? "",
    maxUploadMb: Number(
      process.env.AI_ENVIRONMENT_REPORT_MAX_UPLOAD_MB ??
        process.env.AI_SCANNER_MAX_UPLOAD_MB ??
        10,
    ),
  };
}

async function resolveEnvironmentImageRater(
  rateEnvironmentImage?: EnvironmentReportRatingInference,
) {
  if (rateEnvironmentImage) return rateEnvironmentImage;

  const { rateEnvironmentImageWithOpenRouter } = await import(
    "@/lib/services/environment-report-rating"
  );
  return rateEnvironmentImageWithOpenRouter;
}

function getSingleFormValue(formData: FormData, field: string) {
  const values = formData.getAll(field);
  if (values.length === 0) return undefined;
  if (values.length > 1) {
    throw new AiScannerRequestError(`The ${field} field must appear only once.`);
  }

  const value = values[0];
  if (value instanceof File) {
    throw new AiScannerRequestError(`The ${field} field must be text.`);
  }

  return value;
}

function readEnvironmentReportFormFields(formData: FormData) {
  const allowedKeys = new Set(["image", "note"]);

  for (const key of formData.keys()) {
    if (!allowedKeys.has(key)) {
      throw new AiScannerRequestError(`Unexpected field: ${key}.`);
    }
  }

  return {
    note: getSingleFormValue(formData, "note"),
  };
}

export async function handleCreateEnvironmentReport(
  request: Request,
  dependencies: EnvironmentReportHandlerDependencies = {},
) {
  try {
    const config = readEnvironmentReportConfig(dependencies.aiConfig);
    if (!config.openRouterApiKey || !config.model || !Number.isFinite(config.maxUploadMb) || config.maxUploadMb <= 0) {
      throw new Error("Environment report AI configuration is invalid.");
    }

    const { file, formData } = await readSingleImageFromMultipartRequest(
      request,
      config.maxUploadMb * 1024 * 1024,
    );
    const parsed = createEnvironmentReportSubmissionSchema.safeParse(
      readEnvironmentReportFormFields(formData),
    );
    if (!parsed.success) return validationError(parsed.error);

    const rateEnvironmentImage = await resolveEnvironmentImageRater(dependencies.rateEnvironmentImage);
    let rating;
    try {
      rating = await rateEnvironmentImage(file, config, parsed.data.note);
    } catch (error) {
      throw toAiScannerProviderError(error);
    }
    return NextResponse.json(rating);
  } catch (error) {
    if (error instanceof AiScannerRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AiScannerProviderError) {
      console.error("Environment report AI rating failed", error.providerCause ?? error);
      return NextResponse.json(
        { error: error.message, code: error.code, reason: error.reason },
        { status: 502 },
      );
    }

    console.error("Environment report analysis failed", error);
    return NextResponse.json(
      { error: "The environment image could not be analyzed." },
      { status: 500 },
    );
  }
}
