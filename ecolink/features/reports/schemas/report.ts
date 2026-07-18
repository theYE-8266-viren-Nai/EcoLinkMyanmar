import { z } from "zod";

export const submitReportLocationSchema = z.object({
  latitude: z.coerce.number().min(-90, "Latitude is outside the valid range.").max(90, "Latitude is outside the valid range."),
  longitude: z.coerce.number().min(-180, "Longitude is outside the valid range.").max(180, "Longitude is outside the valid range."),
});

export type SubmitReportInput = {
  latitude: number;
  longitude: number;
  image: File;
};

export const rejectReportSchema = z.object({
  reason: z.string().trim().max(300).optional().transform((value) => value || undefined),
});

export const reportIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Report id must be a valid UUID.");

export type RejectReportInput = z.infer<typeof rejectReportSchema>;
