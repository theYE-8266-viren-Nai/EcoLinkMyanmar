import { z } from "zod";

import { MembershipRole, MembershipStatus, OrganizationType, VerificationStatus } from "@/lib/generated/prisma/client";
import { decimalStringSchema, uuidSchema } from "@/schemas/db";

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  organizationType: z.enum(OrganizationType),
  verificationStatus: z.enum(VerificationStatus).default("DRAFT"),
  description: z.string().trim().max(1200).optional(),
  websiteUrl: z.url().optional(),
  contactEmail: z.email().optional(),
  contactPhone: z.string().trim().max(40).optional(),
  logoUrl: z.url().optional(),
});

export const organizationMembershipSchema = z.object({
  organizationId: uuidSchema,
  userProfileId: uuidSchema,
  role: z.enum(MembershipRole),
  status: z.enum(MembershipStatus).default("INVITED"),
  invitedById: uuidSchema.optional(),
});

export const organizationAcceptedMaterialSchema = z.object({
  organizationId: uuidSchema,
  materialCategoryId: uuidSchema,
  minimumWeightKg: decimalStringSchema.optional(),
  maximumWeightKg: decimalStringSchema.optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const organizationVerificationSchema = z.object({
  organizationId: uuidSchema,
  submittedById: uuidSchema,
  documentStoragePath: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000).optional(),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type OrganizationMembershipInput = z.infer<typeof organizationMembershipSchema>;
export type OrganizationAcceptedMaterialInput = z.infer<typeof organizationAcceptedMaterialSchema>;
export type OrganizationVerificationInput = z.infer<typeof organizationVerificationSchema>;
