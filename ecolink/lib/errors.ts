export function sanitizeErrorMessage(
  message: string | null | undefined,
  fallback = "Something went wrong. Please try again."
): string {
  if (!message) return fallback;

  const lowerMessage = message.toLowerCase();

  // Keywords indicating Postgres / Supabase database structures, RPC functions, or config details.
  const isTechnical =
    lowerMessage.includes("relation") ||
    lowerMessage.includes("column") ||
    lowerMessage.includes("violates") ||
    lowerMessage.includes("constraint") ||
    lowerMessage.includes("foreign key") ||
    lowerMessage.includes("database") ||
    lowerMessage.includes("query") ||
    lowerMessage.includes("syntax error") ||
    lowerMessage.includes("uuid") ||
    lowerMessage.includes("rpc") ||
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("rls") ||
    lowerMessage.includes("row level security") ||
    lowerMessage.includes("policy") ||
    lowerMessage.includes("supabase") ||
    lowerMessage.includes("postgres") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("ensure_") ||
    lowerMessage.includes("redeem_") ||
    lowerMessage.includes("fulfill_") ||
    lowerMessage.includes("submit_") ||
    lowerMessage.includes("get_") ||
    lowerMessage.includes("function") ||
    lowerMessage.includes("table") ||
    lowerMessage.includes("point_ledger") ||
    lowerMessage.includes("environment_report") ||
    lowerMessage.includes("profile") ||
    lowerMessage.includes("auth") ||
    lowerMessage.includes("openrouter") ||
    lowerMessage.includes("api_key");

  if (isTechnical) {
    return fallback;
  }

  return message;
}
