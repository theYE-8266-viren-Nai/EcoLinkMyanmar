import { z } from "zod";

import { CampaignParticipationStatus, CampaignStatus, ContentStatus } from "@/lib/generated/prisma/client";
import { uuidSchema } from "@/schemas/db";

export const educationContentSchema = z.object({
  authorId: uuidSchema,
  organizationId: uuidSchema.optional(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().min(10).max(300),
  body: z.string().trim().min(20),
  coverImageUrl: z.url().optional(),
  contentStatus: z.enum(ContentStatus).default("DRAFT"),
  publishedAt: z.coerce.date().optional(),
});

export const communityCampaignSchema = z.object({
  organizationId: uuidSchema,
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(20).max(2000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  locationName: z.string().trim().max(160).optional(),
  address: z.string().trim().max(300).optional(),
  status: z.enum(CampaignStatus).default("DRAFT"),
});

export const campaignParticipantSchema = z.object({
  campaignId: uuidSchema,
  userProfileId: uuidSchema,
  participationStatus: z.enum(CampaignParticipationStatus).default("REGISTERED"),
});

export type EducationContentInput = z.infer<typeof educationContentSchema>;
export type CommunityCampaignInput = z.infer<typeof communityCampaignSchema>;
export type CampaignParticipantInput = z.infer<typeof campaignParticipantSchema>;
