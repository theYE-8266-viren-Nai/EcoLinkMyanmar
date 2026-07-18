import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { faqAssistantRequestSchema, faqFeedbackRequestSchema } from "@/features/faq-assistant/schemas/faq-assistant";
import { generateFaqAssistantResponse } from "@/features/faq-assistant/services/assistant";
import { insertFaqMessage, listRecentFaqMessages, upsertFaqFeedback } from "@/features/faq-assistant/services/memory-store";
import { sanitizeText } from "@/features/faq-assistant/utils/text";

export const FAQ_ERROR_MESSAGES = {
  malformed: "The question format is invalid. Please ask a shorter, clearer question.",
  unavailable: "The AI assistant is temporarily unavailable. Please try again shortly.",
  feedbackFailed: "Feedback could not be saved yet.",
} as const;

async function getAnonymousFaqId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("ecolink_faq_id")?.value;
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;

  const id = randomUUID();
  cookieStore.set("ecolink_faq_id", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return id;
}

export async function handleFaqAssistantPost(request: Request) {
  try {
    const anonymousId = await getAnonymousFaqId();
    const body = faqAssistantRequestSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: FAQ_ERROR_MESSAGES.malformed }, { status: 400 });

    const history = listRecentFaqMessages(anonymousId);
    const question = sanitizeText(body.data.question, 700);
    const userMessageId = insertFaqMessage({ anonymousId, role: "user", content: question });

    const apiKey = process.env.OPENROUTER_API_KEY ?? "";
    const model = process.env.AI_SCANNER_MODEL ?? "";
    if (!apiKey || !model) throw new Error("FAQ assistant OpenRouter configuration is invalid.");

    const result = await generateFaqAssistantResponse({
      anonymousId,
      question,
      history,
      apiKey,
      model,
      timeoutMs: Number(process.env.FAQ_ASSISTANT_TIMEOUT_MS ?? 20_000),
    });

    const messageId = insertFaqMessage({
      anonymousId,
      role: "assistant",
      content: result.client.answer,
      structuredResponse: result.structured,
    });

    return NextResponse.json({ messageId, userMessageId, response: result.client });
  } catch (error) {
    console.error("FAQ assistant request failed", error);
    return NextResponse.json({ error: FAQ_ERROR_MESSAGES.unavailable }, { status: 503 });
  }
}

export async function handleFaqFeedbackPost(request: Request) {
  try {
    const body = faqFeedbackRequestSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: FAQ_ERROR_MESSAGES.malformed }, { status: 400 });

    upsertFaqFeedback({
      anonymousId: await getAnonymousFaqId(),
      messageId: body.data.messageId,
      value: body.data.value,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("FAQ feedback request failed", error);
    return NextResponse.json({ error: FAQ_ERROR_MESSAGES.feedbackFailed }, { status: 500 });
  }
}
