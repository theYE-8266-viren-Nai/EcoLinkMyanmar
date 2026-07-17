import { z } from "zod";

import { environmentReportRatingSchema } from "@/schemas/environment-report-rating";

export const CreateEnvironmentReportRequestBodySchema = z
  .object({
    image: z
      .file()
      .mime(["image/jpeg", "image/png", "image/webp"])
      .describe("JPEG, PNG, or WebP environment photo."),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const EnvironmentReportResponseSchema = environmentReportRatingSchema.describe(
  "AI rating of the visible environment. A dirtiness score of 10 means very dirty.",
);

export const createEnvironmentReportSubmissionSchema = z
  .object({
    note: z
      .string()
      .trim()
      .max(500)
      .transform((value) => value || undefined)
      .optional(),
  })
  .strict();

export type CreateEnvironmentReportSubmissionInput = z.infer<
  typeof createEnvironmentReportSubmissionSchema
>;
