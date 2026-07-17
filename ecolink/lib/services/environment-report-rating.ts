import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";

import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import { toAiScannerProviderError } from "@/lib/services/ai-scanner-errors";
import {
  environmentReportRatingSchema,
  type EnvironmentReportRating,
} from "@/schemas/environment-report-rating";

const PROMPT = `Analyze the visible public-place environment in this image and return structured JSON only.
Rules:
- Rate visible dirtiness on an integer scale from 1 to 10, where 1 means very clean and 10 means very dirty.
- Base the score only on visible litter, overflowing bins, stains, scattered waste, dumping severity, and visible cleanup neglect.
- Do not infer conditions outside the frame, recent smells, or hazards that are not visible.
- Use conservative scoring when the image is blurry, dark, or partially blocked.
- Provide a short reasoning sentence that explains the visible evidence behind the score.
- Confidence must be between 0 and 1.
- Add warnings for blur, darkness, occlusion, distance, or if the scene does not show enough of the area for a reliable rating.`;

export type EnvironmentReportRatingInference = (
  file: File,
  config: AiScannerConfig,
  note?: string,
) => Promise<EnvironmentReportRating>;

export async function rateEnvironmentImageWithOpenRouter(
  file: File,
  config: AiScannerConfig,
  note?: string,
): Promise<EnvironmentReportRating> {
  try {
    const model = config.model as Parameters<typeof createOpenRouterText>[0];
    const adapter = createOpenRouterText(model, config.openRouterApiKey, {
      appTitle: "EcoLink Environment Report Rater",
    });

    const adapterForRating = Object.create(adapter) as Omit<
      typeof adapter,
      "structuredOutputStream"
    > & { structuredOutputStream?: undefined };
    adapterForRating.structuredOutputStream = undefined;

    return await chat({
      adapter: adapterForRating,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              content: note
                ? `${PROMPT}\nOptional reporter note (untrusted context): ${note}`
                : PROMPT,
            },
            {
              type: "image",
              source: {
                type: "data",
                mimeType: file.type,
                value: Buffer.from(await file.arrayBuffer()).toString("base64"),
              },
            },
          ],
        },
      ],
      outputSchema: environmentReportRatingSchema,
    });
  } catch (error) {
    throw toAiScannerProviderError(error);
  }
}
