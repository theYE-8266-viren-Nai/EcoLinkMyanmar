import { z } from "zod";

const finiteNumber = z.number().finite();

export const AiScanRequestBodySchema = z.object({
  image: z
    .file()
    .mime(["image/jpeg", "image/png", "image/webp"])
    .describe("JPEG, PNG, or WebP image up to the configured upload limit."),
});

export const AiScanSummaryResponseSchema = z.object({
  primaryMaterialLabel: z.string().nullable(),
  primaryMaterialSlug: z.string().nullable(),
  estimatedBottleCount: finiteNumber,
  estimatedTotalWeightKg: finiteNumber,
  confidence: finiteNumber,
});

export const AiScanDetectionResponseSchema = z.object({
  materialLabel: z.string(),
  materialSlug: z.string().nullable(),
  itemType: z.string(),
  estimatedCount: finiteNumber,
  estimatedWeightKg: finiteNumber,
  confidence: finiteNumber,
  reasoning: z.string(),
});

export const AiScanResponseSchema = z.object({
  summary: AiScanSummaryResponseSchema,
  detections: z.array(AiScanDetectionResponseSchema),
  warnings: z.array(z.string()),
});

export const aiScanProviderOutputSchema = z.object({
  summary: z.object({
    primaryMaterialLabel: z.string().trim().min(1).nullable(),
    estimatedBottleCount: finiteNumber,
    estimatedTotalWeightKg: finiteNumber,
    confidence: finiteNumber,
  }),
  detections: z.array(
    z.object({
      materialLabel: z.string().trim().min(1),
      itemType: z.string().trim().min(1),
      estimatedCount: finiteNumber,
      estimatedWeightKg: finiteNumber,
      confidence: finiteNumber,
      reasoning: z.string().trim().min(1),
    }),
  ),
  warnings: z.array(z.string().trim().min(1)),
});

export type AiScanProviderOutput = z.infer<typeof aiScanProviderOutputSchema>;

export interface AiScanDetectionResponse {
  materialLabel: string;
  materialSlug: string | null;
  itemType: string;
  estimatedCount: number;
  estimatedWeightKg: number;
  confidence: number;
  reasoning: string;
}

export interface AiScanResponse {
  summary: {
    primaryMaterialLabel: string | null;
    primaryMaterialSlug: string | null;
    estimatedBottleCount: number;
    estimatedTotalWeightKg: number;
    confidence: number;
  };
  detections: AiScanDetectionResponse[];
  warnings: string[];
}
