import { z } from "zod";

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export const ValidationErrorResponseSchema = z.object({
  error: z.string(),
  details: z
    .object({
      formErrors: z.array(z.string()).optional(),
      fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    })
    .optional(),
});

export const AiProviderErrorCodeSchema = z.enum([
  "AI_AUTHENTICATION_FAILED",
  "AI_CREDITS_EXHAUSTED",
  "AI_INPUT_REJECTED",
  "AI_INVALID_RESPONSE",
  "AI_MODEL_UNAVAILABLE",
  "AI_PROVIDER_FAILED",
  "AI_PROVIDER_RATE_LIMITED",
  "AI_PROVIDER_UNREACHABLE",
  "AI_REQUEST_TIMEOUT",
]);

export const AiProviderErrorResponseSchema = z.object({
  error: z.string(),
  code: AiProviderErrorCodeSchema,
  reason: z.string(),
});
