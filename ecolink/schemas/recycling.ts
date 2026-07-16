import { z } from "zod";

import { PickupStatus, RecyclingRequestStatus } from "@/lib/generated/prisma/client";
import { decimalStringSchema, uuidSchema } from "@/schemas/db";

export const materialCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).optional(),
  acceptedExamples: z.array(z.string().trim().min(1)).default([]),
  rejectedExamples: z.array(z.string().trim().min(1)).default([]),
  preparationInstructions: z.string().trim().max(1000).optional(),
  defaultRewardRate: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const recyclingRequestItemSchema = z.object({
  materialCategoryId: uuidSchema,
  estimatedWeightKg: decimalStringSchema.optional(),
  confirmedWeightKg: decimalStringSchema.optional(),
  conditionNotes: z.string().trim().max(500).optional(),
});

export const recyclingRequestSchema = z.object({
  requesterId: uuidSchema,
  addressId: uuidSchema,
  status: z.enum(RecyclingRequestStatus).default("DRAFT"),
  preferredPickupDate: z.coerce.date().optional(),
  preferredPickupWindow: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  photoStoragePath: z.string().trim().max(500).optional(),
  estimatedWeightKg: decimalStringSchema.optional(),
  assignedOrganizationId: uuidSchema.optional(),
  items: z.array(recyclingRequestItemSchema).min(1),
});

export const pickupSchema = z.object({
  recyclingRequestId: uuidSchema,
  organizationId: uuidSchema,
  assignedMemberId: uuidSchema.optional(),
  status: z.enum(PickupStatus).default("SCHEDULED"),
  scheduledStartAt: z.coerce.date(),
  scheduledEndAt: z.coerce.date(),
});

export type MaterialCategoryInput = z.infer<typeof materialCategorySchema>;
export type RecyclingRequestInput = z.infer<typeof recyclingRequestSchema>;
export type PickupInput = z.infer<typeof pickupSchema>;
