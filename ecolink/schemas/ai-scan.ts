import { z } from "zod";

const finiteNumber = z.number().finite();

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
