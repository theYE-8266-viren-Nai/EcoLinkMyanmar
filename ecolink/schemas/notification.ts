import { z } from "zod";

import { NotificationType } from "@/lib/generated/prisma/client";
import { uuidSchema } from "@/schemas/db";

export const notificationSchema = z.object({
  userProfileId: uuidSchema,
  notificationType: z.enum(NotificationType),
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().min(2).max(500),
  actionUrl: z.string().trim().max(300).optional(),
});

export type NotificationInput = z.infer<typeof notificationSchema>;
