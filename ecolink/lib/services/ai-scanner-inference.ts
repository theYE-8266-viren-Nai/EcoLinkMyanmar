import { chat } from "@tanstack/ai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";

import { toAiScannerProviderError } from "@/lib/services/ai-scanner-errors";
import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import {
  aiScanProviderOutputSchema,
  type AiScanProviderOutput,
} from "@/schemas/ai-scan";

const PROMPT = `Analyze only the visible recyclable items in the image. Return structured JSON only.
Rules:
- Use a real material label such as Plastic, Paper and Cardboard, or Metal; never use generic labels like RECYCLE, recyclable, waste, or mixed.
- Identify each visible item group with material, item type, count, estimated empty weight in kilograms, confidence, and brief visual reasoning.
- Count bottles only when their bodies are visibly distinguishable. Do not count the same bottle twice, printed recycling symbols, caps alone, or the cardboard box unless it is a recyclable detection.
- Estimate empty container weight, not the box, water, or other contents. The summary total weight must equal the sum of detection weights, and the summary bottle count must equal the bottle detection counts.
- Use conservative non-negative estimates and confidence values from 0 to 1.
- Add warnings for blur, occlusion, uncertainty, duplicate risk, or if the image does not show enough detail for a reliable count.`;

export type AiScannerInference = (
  file: File,
  config: AiScannerConfig,
) => Promise<AiScanProviderOutput>;

export async function analyzeImageWithOpenRouter(
  file: File,
  config: AiScannerConfig,
): Promise<AiScanProviderOutput> {
  try {
    const model = config.model as Parameters<typeof createOpenRouterText>[0];
    const adapter = createOpenRouterText(model, config.openRouterApiKey, {
      appTitle: "EcoLink AI Bottle Scanner",
    });

    // TanStack's OpenRouter adapter exposes a streaming structured-output
    // implementation by default. Its stream error event intentionally only
    // contains a generic message, which hides the HTTP status that lets the
    // route explain authentication, model, credit, and rate-limit failures.
    // Disable only that optional method so TanStack uses the adapter's
    // non-streaming implementation and preserves the original SDK error.
    const adapterForScanner = Object.create(adapter) as Omit<
      typeof adapter,
      "structuredOutputStream"
    > & { structuredOutputStream?: undefined };
    adapterForScanner.structuredOutputStream = undefined;

    return await chat({
      adapter: adapterForScanner,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", content: PROMPT },
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
      outputSchema: aiScanProviderOutputSchema,
    });
  } catch (error) {
    throw toAiScannerProviderError(error);
  }
}
