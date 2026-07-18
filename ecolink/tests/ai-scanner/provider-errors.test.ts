import { describe, expect, it } from "vitest";

import { toAiScannerProviderError } from "@/lib/services/ai-scanner-errors";

describe("toAiScannerProviderError", () => {
  it.each([
    [401, "AI_AUTHENTICATION_FAILED"],
    [402, "AI_CREDITS_EXHAUSTED"],
    [404, "AI_MODEL_UNAVAILABLE"],
    [429, "AI_PROVIDER_RATE_LIMITED"],
    [504, "AI_REQUEST_TIMEOUT"],
  ] as const)("maps provider status %i to %s", (statusCode, expectedCode) => {
    const result = toAiScannerProviderError({ statusCode, message: "Provider request failed" });

    expect(result.code).toBe(expectedCode);
    expect(result.reason).not.toContain("Provider request failed");
  });

  it("recognizes nested connection failures", () => {
    const result = toAiScannerProviderError({
      message: "Request failed",
      cause: { name: "ConnectionError", message: "fetch failed" },
    });

    expect(result.code).toBe("AI_PROVIDER_UNREACHABLE");
    expect(result.reason).toBe("The server could not connect to OpenRouter.");
  });

  it("uses a safe fallback instead of exposing an unknown provider message", () => {
    const result = toAiScannerProviderError(
      new Error("sensitive raw provider response should not reach the client"),
    );

    expect(result.code).toBe("AI_PROVIDER_FAILED");
    expect(result.reason).toBe("The AI provider request failed for an unknown reason.");
    expect(result.reason).not.toContain("sensitive raw provider response");
  });
});
