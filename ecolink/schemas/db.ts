import { z } from "zod";

export const uuidSchema = z.uuid("Expected a valid UUID.");

export const paginationSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const decimalStringSchema = z
  .union([z.number(), z.string().trim()])
  .transform((value) => String(value))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Expected a positive decimal value."));

export const addressSchema = z.object({
  userProfileId: uuidSchema,
  label: z.string().trim().min(1).max(80),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  township: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  latitude: decimalStringSchema.optional(),
  longitude: decimalStringSchema.optional(),
  instructions: z.string().trim().max(500).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
