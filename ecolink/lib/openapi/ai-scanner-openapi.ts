export const aiScannerOpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "EcoLink AI Bottle Scanner API",
    version: "1.0.0",
    description:
      "Stateless image analysis for recyclable materials, bottle counts, and estimated recyclable weight.",
  },
  servers: [{ url: "/", description: "Current EcoLink deployment" }],
  tags: [{ name: "AI Scanner", description: "Analyze recyclable items in an image." }],
  paths: {
    "/api/ai/scans": {
      post: {
        operationId: "analyzeRecyclableImage",
        summary: "Analyze a recyclable-items image",
        description:
          "Accepts exactly one JPEG, PNG, or WebP image up to the configured upload limit. The image and result are not persisted.",
        tags: ["AI Scanner"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: {
                    type: "string",
                    format: "binary",
                    description: "JPEG, PNG, or WebP image. Default maximum size: 10 MB.",
                  },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Normalized image analysis.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AiScanResponse" },
              },
            },
          },
          "400": {
            description: "Invalid multipart request or image.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "500": {
            description: "Internal processing failure.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
          "502": {
            description: "Vision provider failure or unusable provider output.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AiProviderErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      AiScanSummary: {
        type: "object",
        required: [
          "primaryMaterialLabel",
          "primaryMaterialSlug",
          "estimatedBottleCount",
          "estimatedTotalWeightKg",
          "confidence",
        ],
        properties: {
          primaryMaterialLabel: { type: ["string", "null"], example: "Plastic" },
          primaryMaterialSlug: { type: ["string", "null"], example: "plastic" },
          estimatedBottleCount: { type: "integer", minimum: 0, maximum: 1000, example: 3 },
          estimatedTotalWeightKg: {
            type: "number",
            minimum: 0,
            maximum: 1000,
            example: 0.12,
          },
          confidence: { type: "number", minimum: 0, maximum: 1, example: 0.91 },
        },
        additionalProperties: false,
      },
      AiScanDetection: {
        type: "object",
        required: [
          "materialLabel",
          "materialSlug",
          "itemType",
          "estimatedCount",
          "estimatedWeightKg",
          "confidence",
          "reasoning",
        ],
        properties: {
          materialLabel: { type: "string", example: "Plastic" },
          materialSlug: { type: ["string", "null"], example: "plastic" },
          itemType: { type: "string", example: "bottle" },
          estimatedCount: { type: "integer", minimum: 0, maximum: 1000, example: 3 },
          estimatedWeightKg: { type: "number", minimum: 0, maximum: 1000, example: 0.12 },
          confidence: { type: "number", minimum: 0, maximum: 1, example: 0.91 },
          reasoning: {
            type: "string",
            example: "Three plastic bottles are clearly visible.",
          },
        },
        additionalProperties: false,
      },
      AiScanResponse: {
        type: "object",
        required: ["summary", "detections", "warnings"],
        properties: {
          summary: { $ref: "#/components/schemas/AiScanSummary" },
          detections: {
            type: "array",
            items: { $ref: "#/components/schemas/AiScanDetection" },
          },
          warnings: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
        additionalProperties: false,
      },
      AiProviderErrorResponse: {
        type: "object",
        required: ["error", "code", "reason"],
        properties: {
          error: { type: "string", example: "AI image analysis failed." },
          code: {
            type: "string",
            enum: [
              "AI_AUTHENTICATION_FAILED",
              "AI_CREDITS_EXHAUSTED",
              "AI_INPUT_REJECTED",
              "AI_INVALID_RESPONSE",
              "AI_MODEL_UNAVAILABLE",
              "AI_PROVIDER_FAILED",
              "AI_PROVIDER_RATE_LIMITED",
              "AI_PROVIDER_UNREACHABLE",
              "AI_REQUEST_TIMEOUT",
            ],
            example: "AI_PROVIDER_RATE_LIMITED",
          },
          reason: {
            type: "string",
            example: "OpenRouter or the selected model is currently rate-limiting requests.",
          },
        },
        additionalProperties: false,
      },
    },
  },
} as const;
