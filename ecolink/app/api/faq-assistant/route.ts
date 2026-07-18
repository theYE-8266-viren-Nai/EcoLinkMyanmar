import { handleFaqAssistantPost } from "@/features/faq-assistant/api/faq-assistant-handlers";

export const runtime = "nodejs";

/**
 * Ask the FAQ assistant
 * @summary Ask the FAQ assistant
 * @description Returns a validated Burmese marketplace FAQ response with trusted approved video cards.
 * @tag FAQ Assistant
 * @body faqAssistantRequestSchema
 * @response 200:faqAssistantStructuredResponseSchema:Assistant response.
 * @add 400:ErrorResponseSchema:Malformed request.
 * @add 503:ErrorResponseSchema:Assistant unavailable.
 * @openapi
 */
export async function POST(request: Request) {
  return handleFaqAssistantPost(request);
}
