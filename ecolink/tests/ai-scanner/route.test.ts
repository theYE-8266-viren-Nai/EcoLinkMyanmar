import { describe, expect, it, vi } from "vitest";

import { handleAiScanRequest } from "@/app/api/ai/scans/route";
import type { AiScannerConfig } from "@/lib/services/ai-scanner-config";
import { AiScannerProviderError } from "@/lib/services/ai-scanner-errors";
import type { AiScannerInference } from "@/lib/services/ai-scanner-inference";

const config: AiScannerConfig = {
  openRouterApiKey: "test-key",
  model: "openrouter-test-model",
  maxUploadMb: 10,
};

const providerResult = {
  summary: {
    primaryMaterialLabel: "Plastic",
    estimatedBottleCount: 2,
    estimatedTotalWeightKg: 0.08,
    confidence: 0.9,
  },
  detections: [
    {
      materialLabel: "Plastic",
      itemType: "bottle",
      estimatedCount: 2,
      estimatedWeightKg: 0.08,
      confidence: 0.9,
      reasoning: "Two plastic bottles are clearly visible.",
    },
  ],
  warnings: [],
};

function createInference(result = providerResult): AiScannerInference {
  return vi.fn(async () => result);
}

function createHandler(
  overrides: {
    inference?: AiScannerInference;
    maxUploadMb?: number;
  } = {},
) {
  return (request: Request) =>
    handleAiScanRequest(request, {
      config: { ...config, maxUploadMb: overrides.maxUploadMb ?? config.maxUploadMb },
      analyzeImage: overrides.inference ?? createInference(),
    });
}

function multipartRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.append("image", file);

  return new Request("http://localhost/api/ai/scans", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/ai/scans", () => {
  it("returns 400 when the image is missing", async () => {
    const response = await createHandler()(multipartRequest());
    expect(response.status).toBe(400);
  });

  it("returns 400 when more than one file is uploaded", async () => {
    const formData = new FormData();
    formData.append("image", new File(["one"], "one.png", { type: "image/png" }));
    formData.append("image", new File(["two"], "two.png", { type: "image/png" }));
    const request = new Request("http://localhost/api/ai/scans", {
      method: "POST",
      body: formData,
    });

    const response = await createHandler()(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when the request is not multipart", async () => {
    const request = new Request("http://localhost/api/ai/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: "not-a-file" }),
    });

    const response = await createHandler()(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unsupported MIME type", async () => {
    const response = await createHandler()(
      multipartRequest(new File(["text"], "scan.txt", { type: "text/plain" })),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for an oversized image", async () => {
    const response = await createHandler({ maxUploadMb: 0.000001 })(
      multipartRequest(new File(["too large"], "scan.png", { type: "image/png" })),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed multipart data", async () => {
    const request = new Request("http://localhost/api/ai/scans", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      body: "not-a-valid-multipart-body",
    });
    const response = await createHandler()(request);
    expect(response.status).toBe(400);
  });

  it("returns 502 when inference fails", async () => {
    const inference: AiScannerInference = vi.fn(async () => {
      throw new AiScannerProviderError(
        "AI_CREDITS_EXHAUSTED",
        "The OpenRouter account does not have enough quota for this analysis.",
      );
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await createHandler({ inference })(
      multipartRequest(new File(["image"], "scan.webp", { type: "image/webp" })),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "AI image analysis failed.",
      code: "AI_CREDITS_EXHAUSTED",
      reason: "The OpenRouter account does not have enough quota for this analysis.",
    });
    consoleError.mockRestore();
  });

  it("returns only normalized analysis data from the uploaded image", async () => {
    const inference = createInference();
    const response = await createHandler({ inference })(
      multipartRequest(new File(["image"], "scan.jpg", { type: "image/jpeg" })),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      summary: {
        primaryMaterialLabel: "Plastic",
        primaryMaterialSlug: "pet-plastic",
        estimatedBottleCount: 2,
        estimatedTotalWeightKg: 0.08,
        confidence: 0.9,
      },
      detections: [
        {
          materialLabel: "Plastic",
          materialSlug: "pet-plastic",
          itemType: "bottle",
          estimatedCount: 2,
          estimatedWeightKg: 0.08,
          confidence: 0.9,
          reasoning: "Two plastic bottles are clearly visible.",
        },
      ],
      warnings: [],
    });
    expect(body).not.toHaveProperty("scanId");
    expect(body).not.toHaveProperty("status");
    expect(inference).toHaveBeenCalledOnce();
  });
});
