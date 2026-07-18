import { randomUUID } from "node:crypto";

import type { FaqAssistantStructuredResponse } from "@/features/faq-assistant/schemas/faq-assistant";
import type { FaqStoredMessage } from "@/features/faq-assistant/types/faq-assistant";

const conversations = new Map<string, FaqStoredMessage[]>();
const feedback = new Map<string, { anonymousId: string; messageId: string; value: "useful" | "not_useful"; createdAt: string }>();

export function listRecentFaqMessages(anonymousId: string): FaqStoredMessage[] {
  return (conversations.get(anonymousId) ?? []).slice(-10);
}

export function insertFaqMessage(input: {
  anonymousId: string;
  role: "user" | "assistant";
  content: string;
  structuredResponse?: FaqAssistantStructuredResponse | null;
}) {
  const message: FaqStoredMessage = {
    id: randomUUID(),
    role: input.role,
    content: input.content,
    structuredResponse: input.structuredResponse ?? null,
    createdAt: new Date().toISOString(),
  };
  const next = [...(conversations.get(input.anonymousId) ?? []), message].slice(-20);
  conversations.set(input.anonymousId, next);
  return message.id;
}

export function upsertFaqFeedback(input: {
  anonymousId: string;
  messageId: string;
  value: "useful" | "not_useful";
}) {
  feedback.set(`${input.anonymousId}:${input.messageId}`, {
    ...input,
    createdAt: new Date().toISOString(),
  });
}
