import { describe, expect, it } from "vitest";

import { AiScannerProviderError } from "@/lib/services/ai-scanner-errors";
import { normalizeAiScanResult } from "@/lib/services/ai-scanner-normalization";

describe("normalizeAiScanResult", () => {
  it("matches the static EcoLink taxonomy and normalizes numeric values", () => {
    const result = normalizeAiScanResult({
      summary: {
        primaryMaterialLabel: "Plastic",
        estimatedBottleCount: 2.6,
        estimatedTotalWeightKg: 0.45678,
        confidence: 1.4,
      },
      detections: [
        {
          materialLabel: "paper-cardboard",
          itemType: "box",
          estimatedCount: -2,
          estimatedWeightKg: 0.33339,
          confidence: -0.4,
          reasoning: "One cardboard box is visible.",
        },
      ],
      warnings: [],
    });

    expect(result.summary).toEqual({
      primaryMaterialLabel: "paper-cardboard",
      primaryMaterialSlug: "paper-cardboard",
      estimatedBottleCount: 0,
      estimatedTotalWeightKg: 0.333,
      confidence: 1,
    });
    expect(result.detections[0]).toMatchObject({
      materialSlug: "paper-cardboard",
      estimatedCount: 0,
      estimatedWeightKg: 0.333,
      confidence: 0,
    });
  });

  it("derives an app-safe bottle summary from detections", () => {
    const result = normalizeAiScanResult({
      summary: {
        primaryMaterialLabel: "RECYCLE",
        estimatedBottleCount: 11,
        estimatedTotalWeightKg: 0.65,
        confidence: 0.9,
      },
      detections: [
        {
          materialLabel: "Plastic",
          itemType: "Water Bottle",
          estimatedCount: 11,
          estimatedWeightKg: 0.15,
          confidence: 0.95,
          reasoning: "Clear plastic water bottles are visible.",
        },
      ],
      warnings: [],
    });

    expect(result.summary).toMatchObject({
      primaryMaterialLabel: "Plastic",
      primaryMaterialSlug: "plastic",
      estimatedBottleCount: 11,
      estimatedTotalWeightKg: 0.15,
    });
    expect(result.warnings).toContain(
      "The total weight was recalculated from the item detections for consistency.",
    );
    expect(result.warnings).toContain(
      "The model returned a generic material label; the summary uses the detected material.",
    );
  });

  it("keeps free-text labels and warns when no static category matches", () => {
    const result = normalizeAiScanResult({
      summary: {
        primaryMaterialLabel: "Glass",
        estimatedBottleCount: 1,
        estimatedTotalWeightKg: 0.4,
        confidence: 0.4,
      },
      detections: [
        {
          materialLabel: "Glass",
          itemType: "bottle",
          estimatedCount: 1,
          estimatedWeightKg: 0.4,
          confidence: 0.4,
          reasoning: "A bottle may be visible.",
        },
      ],
      warnings: [],
    });

    expect(result.summary.primaryMaterialSlug).toBeNull();
    expect(result.detections[0]?.materialSlug).toBeNull();
    expect(result.warnings).toContain(
      "Detected materials could not be matched to an EcoLink material category.",
    );
    expect(result.warnings).toContain("The image is ambiguous; estimates may be unreliable.");
  });

  it("returns a material breakdown for mixed recyclables", () => {
    const result = normalizeAiScanResult({
      summary: {
        primaryMaterialLabel: "Plastic",
        estimatedBottleCount: 2,
        estimatedTotalWeightKg: 0.3,
        confidence: 0.78,
      },
      detections: [
        {
          materialLabel: "Plastic",
          itemType: "bottle",
          estimatedCount: 2,
          estimatedWeightKg: 0.1,
          confidence: 0.85,
          reasoning: "Two plastic bottles are visible.",
        },
        {
          materialLabel: "Metal",
          itemType: "can",
          estimatedCount: 3,
          estimatedWeightKg: 0.2,
          confidence: 0.72,
          reasoning: "Three cans are visible.",
        },
      ],
      warnings: [],
    });

    expect(result.detections.map((detection) => detection.materialSlug)).toEqual([
      "plastic",
      "metal",
    ]);
  });

  it("rejects incomplete provider output", () => {
    expect(() => normalizeAiScanResult({ summary: {} })).toThrow(AiScannerProviderError);
  });
});
