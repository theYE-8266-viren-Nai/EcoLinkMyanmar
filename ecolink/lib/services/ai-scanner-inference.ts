import { toAiScannerProviderError } from "@/lib/services/ai-scanner-errors";
import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import { generateGeminiStructured } from "@/lib/services/gemini-structured";
import { aiScanProviderOutputSchema, type AiScanProviderOutput } from "@/schemas/ai-scan";

const PROMPT = `Analyze only the visible recyclable items in the image. Return structured JSON only.
Use real material labels such as PET plastic, Paper and cardboard, Glass, Aluminium, E-waste, or Batteries.
Identify each visible item group with material, item type, count, estimated empty weight in kilograms, confidence, and brief visual reasoning.
Estimate empty item weight only. Use conservative non-negative estimates and confidence values from 0 to 1.
Add warnings for contamination, blur, occlusion, uncertainty, or when the image lacks enough detail.`;

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["summary", "detections", "warnings", "categories", "isLegit"],
  properties: {
    isLegit: { type: "boolean" },
    summary: { type: "object", required: ["primaryMaterialLabel", "estimatedBottleCount", "estimatedTotalWeightKg", "confidence"], properties: {
      primaryMaterialLabel: { type: ["string", "null"] }, estimatedBottleCount: { type: "number" }, estimatedTotalWeightKg: { type: "number" }, confidence: { type: "number" },
    } },
    detections: { type: "array", items: { type: "object", required: ["materialLabel", "itemType", "estimatedCount", "estimatedWeightKg", "confidence", "reasoning"], properties: {
      materialLabel: { type: "string" }, itemType: { type: "string" }, estimatedCount: { type: "number" }, estimatedWeightKg: { type: "number" }, confidence: { type: "number" }, reasoning: { type: "string" },
    } } },
    categories: {
      type: "array",
      items: { type: "string", enum: ["waste-dump", "blocked-drain", 'water-drain', 'illegal-burning', 'chemical-spill'] },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
};

export type AiScannerInference = (file: File, config: AiScannerConfig) => Promise<AiScanProviderOutput>;

export async function analyzeImageWithGemini(file: File, config: AiScannerConfig): Promise<AiScanProviderOutput> {
  try {
    return await generateGeminiStructured({ apiKey: config.geminiApiKey, model: config.model, prompt: PROMPT, file, responseSchema: RESPONSE_SCHEMA, outputSchema: aiScanProviderOutputSchema });
  } catch (error) {
    throw toAiScannerProviderError(error);
  }
}
