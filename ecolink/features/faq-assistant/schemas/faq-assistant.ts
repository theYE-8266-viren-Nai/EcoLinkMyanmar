import { z } from "zod";

export const checklistStatusSchema = z.enum(["recommended", "warning", "important"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const faqAssistantStructuredResponseSchema = z.object({
  title: z.string().trim().min(1).max(80),
  answer: z.string().trim().min(1).max(900),
  checklist: z.array(z.object({
    text: z.string().trim().min(1).max(180),
    status: checklistStatusSchema,
  })).max(6),
  questionsToAsk: z.array(z.string().trim().min(1).max(180)).max(4),
  warnings: z.array(z.string().trim().min(1).max(220)).max(5),
  videoIds: z.array(z.string().trim().min(1).max(80)).max(3),
  confidence: confidenceSchema,
  needsHumanHelp: z.boolean(),
});

export const faqAssistantRequestSchema = z.object({
  question: z.string().trim().min(2).max(700),
});

export const faqFeedbackRequestSchema = z.object({
  messageId: z.string().uuid(),
  value: z.enum(["useful", "not_useful"]),
});

export type FaqAssistantStructuredResponse = z.infer<typeof faqAssistantStructuredResponseSchema>;
export type FaqAssistantRequest = z.infer<typeof faqAssistantRequestSchema>;
export type FaqFeedbackRequest = z.infer<typeof faqFeedbackRequestSchema>;

export type FaqVideoCard = {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  channelName: string;
  category: string;
};

export type FaqAssistantClientResponse = Omit<FaqAssistantStructuredResponse, "videoIds"> & {
  videos: FaqVideoCard[];
};
