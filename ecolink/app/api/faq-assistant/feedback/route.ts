import { handleFaqFeedbackPost } from "@/features/faq-assistant/api/faq-assistant-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleFaqFeedbackPost(request);
}
