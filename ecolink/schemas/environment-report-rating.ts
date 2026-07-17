import { z } from "zod";

export const environmentReportRatingSchema = z.object({
  dirtinessScore: z.number().int().min(1).max(10),
  confidence: z.number().finite().min(0).max(1),
  reasoning: z.string().trim().min(1),
  warnings: z.array(z.string().trim().min(1)),
});

export type EnvironmentReportRating = z.infer<typeof environmentReportRatingSchema>;
