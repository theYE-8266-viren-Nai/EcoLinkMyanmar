import { z } from "zod";

import { RewardEntryType, RewardOfferStatus, RewardRedemptionStatus, RewardSourceType } from "@/lib/generated/prisma/client";
import { uuidSchema } from "@/schemas/db";

export const rewardOfferSchema = z.object({
  organizationId: uuidSchema.optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(1000),
  pointsCost: z.number().int().positive(),
  quantityAvailable: z.number().int().nonnegative().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  status: z.enum(RewardOfferStatus).default("DRAFT"),
  imageUrl: z.url().optional(),
});

export const rewardLedgerEntrySchema = z.object({
  userProfileId: uuidSchema,
  entryType: z.enum(RewardEntryType),
  points: z.number().int(),
  sourceType: z.enum(RewardSourceType),
  sourceId: uuidSchema.optional(),
  description: z.string().trim().min(2).max(300),
  createdById: uuidSchema.optional(),
});

export const rewardRedemptionSchema = z.object({
  userProfileId: uuidSchema,
  rewardOfferId: uuidSchema,
  status: z.enum(RewardRedemptionStatus).default("PENDING"),
});

export type RewardOfferInput = z.infer<typeof rewardOfferSchema>;
export type RewardLedgerEntryInput = z.infer<typeof rewardLedgerEntrySchema>;
export type RewardRedemptionInput = z.infer<typeof rewardRedemptionSchema>;
