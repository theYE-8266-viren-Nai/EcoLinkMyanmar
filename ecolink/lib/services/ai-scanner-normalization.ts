import { AiScannerProviderError } from "@/lib/services/ai-scanner-errors";
import {
  aiScanProviderOutputSchema,
  type AiScanResponse,
} from "@/schemas/ai-scan";

const MATERIAL_SLUGS = new Map([
  ["plastic", "plastic"],
  ["paper-and-cardboard", "paper-cardboard"],
  ["paper-cardboard", "paper-cardboard"],
  ["metal", "metal"],
]);

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toMaterialSlug(label: string): string | null {
  return MATERIAL_SLUGS.get(toSlug(label)) ?? null;
}

function isGenericMaterialLabel(label: string): boolean {
  return new Set(["recycle", "recyclable", "recyclables", "waste", "mixed-waste"]).has(
    toSlug(label),
  );
}

function clampNumber(value: number, maximum: number, decimals = 0): number {
  const clamped = Math.min(Math.max(value, 0), maximum);
  return Number(clamped.toFixed(decimals));
}

export function normalizeAiScanResult(payload: unknown): AiScanResponse {
  const parsed = aiScanProviderOutputSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AiScannerProviderError(
      "AI_INVALID_RESPONSE",
      "The AI provider returned an incomplete or invalid structured analysis.",
      parsed.error,
    );
  }

  const detections = parsed.data.detections.map((item) => ({
    materialLabel: item.materialLabel,
    materialSlug: toMaterialSlug(item.materialLabel),
    itemType: item.itemType,
    estimatedCount: clampNumber(item.estimatedCount, 1000),
    estimatedWeightKg: clampNumber(item.estimatedWeightKg, 1000, 3),
    confidence: clampNumber(item.confidence, 1, 4),
    reasoning: item.reasoning,
  }));
  const confidence = clampNumber(parsed.data.summary.confidence, 1, 4);
  const warnings = new Set(parsed.data.warnings);

  if (detections.length === 0) {
    warnings.add("No recyclable items could be identified with confidence.");
  }

  if (confidence < 0.5) {
    warnings.add("The image is ambiguous; estimates may be unreliable.");
  }

  if (detections.length > 0 && detections.every((item) => item.materialSlug === null)) {
    warnings.add("Detected materials could not be matched to an EcoLink material category.");
  }

  const primaryDetection = [...detections].sort(
    (a, b) => b.estimatedWeightKg * b.confidence - a.estimatedWeightKg * a.confidence,
  )[0];
  const detectedWeight = Number(
    detections.reduce((total, item) => total + item.estimatedWeightKg, 0).toFixed(3),
  );
  const detectedBottleCount = detections
    .filter((item) => /bottle|container|jug/.test(item.itemType.toLowerCase()))
    .reduce((total, item) => total + item.estimatedCount, 0);
  const modelWeight = clampNumber(parsed.data.summary.estimatedTotalWeightKg, 1000, 3);
  const modelBottleCount = clampNumber(parsed.data.summary.estimatedBottleCount, 1000);

  if (primaryDetection && isGenericMaterialLabel(parsed.data.summary.primaryMaterialLabel ?? "")) {
    warnings.add("The model returned a generic material label; the summary uses the detected material.");
  }

  if (detections.length > 0 && Math.abs(modelWeight - detectedWeight) > 0.01) {
    warnings.add("The total weight was recalculated from the item detections for consistency.");
  }

  if (detections.length > 0 && modelBottleCount !== detectedBottleCount) {
    warnings.add("The bottle count was recalculated from the visible bottle detections.");
  }

  return {
    summary: {
      primaryMaterialLabel: primaryDetection?.materialLabel ?? parsed.data.summary.primaryMaterialLabel,
      primaryMaterialSlug: primaryDetection?.materialSlug ??
        (parsed.data.summary.primaryMaterialLabel
          ? toMaterialSlug(parsed.data.summary.primaryMaterialLabel)
          : null),
      estimatedBottleCount: detections.length > 0 ? detectedBottleCount : modelBottleCount,
      estimatedTotalWeightKg: detections.length > 0 ? detectedWeight : modelWeight,
      confidence,
    },
    detections,
    warnings: [...warnings],
  };
}
