import { z } from "zod";

const issueTypes = [
  "plastic-dump",
  "blocked-drain",
  "water-pollution",
  "illegal-burning",
  "chemical-spill",
] as const;

const severities = ["limited", "concerning", "urgent"] as const;

export const submitReportSchema = z.object({
  title: z.string().trim().min(3, "Add a short report title.").max(120),
  issueType: z.enum(issueTypes),
  severity: z.enum(severities),
  locationText: z.string().trim().min(4, "Add a nearby landmark or coordinates.").max(180),
  details: z.string().trim().max(500).optional().transform((value) => value || undefined),
});

export const rejectReportSchema = z.object({
  reason: z.string().trim().max(300).optional().transform((value) => value || undefined),
});

export const reportIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Report id must be a valid UUID.");

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
export type RejectReportInput = z.infer<typeof rejectReportSchema>;
