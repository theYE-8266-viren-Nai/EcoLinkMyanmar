import { z } from "zod";

export const recyclingIntentSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.email("Enter a valid email address.").trim(),
  materialType: z.string().trim().min(2, "Tell us what material you want to recycle."),
  pickupWindow: z.string().trim().min(2, "Choose a preferred pickup window."),
  notes: z.string().trim().max(500, "Keep notes under 500 characters.").optional(),
});

export type RecyclingIntentInput = z.infer<typeof recyclingIntentSchema>;
