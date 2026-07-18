import type { FaqAssistantClientResponse, FaqAssistantStructuredResponse } from "@/features/faq-assistant/schemas/faq-assistant";

export type FaqArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
  riskLevel: "low" | "medium" | "high";
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApprovedVideo = {
  id: string;
  title: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  channelName: string;
  category: string;
  tags: string[];
  language: "my" | "en" | "my-en";
  isApproved: boolean;
  createdAt: string;
};

export type RetrievedFaqContext = {
  articles: FaqArticle[];
  videos: ApprovedVideo[];
  detectedTopics: string[];
};

export type FaqStoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structuredResponse?: FaqAssistantStructuredResponse | null;
  createdAt: string;
};

export type FaqAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: FaqAssistantClientResponse;
};

export type FaqAssistantDependencies = {
  anonymousId: string;
  question: string;
  history?: FaqStoredMessage[];
};
