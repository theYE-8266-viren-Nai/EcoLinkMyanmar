import { z } from "zod";

import { uuidSchema } from "@/schemas/db";

export const profileSchema = z.object({
  clerkUserId: z.string().trim().min(1),
  email: z.email().trim(),
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  avatarUrl: z.url().optional(),
  preferredLanguage: z.string().trim().min(2).max(12).default("en"),
  defaultAddressId: uuidSchema.optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
