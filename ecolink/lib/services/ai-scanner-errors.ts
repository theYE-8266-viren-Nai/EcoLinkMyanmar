export class AiScannerRequestError extends Error {}

export type AiScannerProviderErrorCode =
  | "AI_AUTHENTICATION_FAILED"
  | "AI_CREDITS_EXHAUSTED"
  | "AI_INPUT_REJECTED"
  | "AI_INVALID_RESPONSE"
  | "AI_MODEL_UNAVAILABLE"
  | "AI_PROVIDER_FAILED"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_UNREACHABLE"
  | "AI_REQUEST_TIMEOUT";

type Failure = [code: AiScannerProviderErrorCode, reason: string];

const FAILURES = {
  authentication: [
    "AI_AUTHENTICATION_FAILED",
    "Gemini rejected the API credentials. Check GEMINI_API_KEY.",
  ],
  credits: [
    "AI_CREDITS_EXHAUSTED",
    "The Gemini project does not have enough quota for this analysis.",
  ],
  input: [
    "AI_INPUT_REJECTED",
    "The selected model rejected the image or structured-output request.",
  ],
  model: [
    "AI_MODEL_UNAVAILABLE",
    "The configured AI_SCANNER_MODEL is unavailable or does not exist.",
  ],
  rateLimit: [
    "AI_PROVIDER_RATE_LIMITED",
    "Gemini or the selected model is currently rate-limiting requests.",
  ],
  timeout: ["AI_REQUEST_TIMEOUT", "The AI provider did not finish the image analysis in time."],
  unreachable: ["AI_PROVIDER_UNREACHABLE", "The server could not connect to Gemini."],
  unavailable: [
    "AI_PROVIDER_UNREACHABLE",
    "Gemini or the selected model is temporarily unavailable.",
  ],
} as const satisfies Record<string, Failure>;

const STATUS_FAILURES: Record<number, Failure> = {
  400: FAILURES.input,
  401: FAILURES.authentication,
  402: FAILURES.credits,
  403: FAILURES.authentication,
  404: FAILURES.model,
  408: FAILURES.timeout,
  413: FAILURES.input,
  422: FAILURES.input,
  429: FAILURES.rateLimit,
  504: FAILURES.timeout,
};

export class AiScannerProviderError extends Error {
  constructor(
    public readonly code: AiScannerProviderErrorCode = "AI_PROVIDER_FAILED",
    public readonly reason = "The AI provider request failed for an unknown reason.",
    public readonly providerCause?: unknown,
  ) {
    super("AI image analysis failed.");
  }
}

function readProviderError(error: unknown) {
  let current = error;
  let statusCode: number | undefined;
  const text: string[] = [];

  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth += 1) {
    const item = current as Record<string, unknown>;
    if (typeof item.statusCode === "number") statusCode ??= item.statusCode;
    if (typeof item.name === "string") text.push(item.name);
    if (typeof item.message === "string") text.push(item.message);
    current = item.cause;
  }

  return { statusCode, text: text.join(" ").toLowerCase() };
}

export function toAiScannerProviderError(error: unknown): AiScannerProviderError {
  if (error instanceof AiScannerProviderError) return error;

  const { statusCode, text } = readProviderError(error);
  const failure =
    (statusCode ? STATUS_FAILURES[statusCode] : undefined) ??
    (/unauthori[sz]ed|api key/.test(text) ? FAILURES.authentication : undefined) ??
    (/payment required|insufficient credit/.test(text) ? FAILURES.credits : undefined) ??
    (/rate limit|too many requests/.test(text) ? FAILURES.rateLimit : undefined) ??
    (/model.+not found|no endpoints found/.test(text) ? FAILURES.model : undefined) ??
    (/timeout|timed out|requestabortederror/.test(text) ? FAILURES.timeout : undefined) ??
    (/connectionerror|fetch failed|network error/.test(text) ? FAILURES.unreachable : undefined) ??
    (statusCode && statusCode >= 500 ? FAILURES.unavailable : undefined);

  return failure
    ? new AiScannerProviderError(failure[0], failure[1], error)
    : new AiScannerProviderError("AI_PROVIDER_FAILED", undefined, error);
}
