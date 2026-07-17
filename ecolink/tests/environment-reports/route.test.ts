import { describe, expect, it, vi } from "vitest";

import { handleCreateEnvironmentReport } from "@/features/environment-reports/api/environment-report-handlers";
import type { EnvironmentReportRating } from "@/schemas/environment-report-rating";

const aiConfig = {
  openRouterApiKey: "test-key",
  model: "test-model",
  maxUploadMb: 10,
};

const rating: EnvironmentReportRating = {
  dirtinessScore: 8,
  confidence: 0.92,
  reasoning: "Visible litter is scattered across the roadside.",
  warnings: ["Only part of the area is visible."],
};

function multipartRequest(
  fields: Record<string, string> = {},
  image: File | null = new File(["test-image"], "report.jpg", { type: "image/jpeg" }),
) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  if (image) formData.append("image", image);

  return new Request("http://localhost/api/environment-reports", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/environment-reports", () => {
  it("rates an image and passes the optional trimmed note to AI", async () => {
    const rateEnvironmentImage = vi.fn(async () => rating);
    const response = await handleCreateEnvironmentReport(
      multipartRequest({ note: "  Plastic waste beside the footpath.  " }),
      { aiConfig, rateEnvironmentImage },
    );

    expect(response.status).toBe(200);
    expect(rateEnvironmentImage).toHaveBeenCalledWith(
      expect.any(File),
      aiConfig,
      "Plastic waste beside the footpath.",
    );
    await expect(response.json()).resolves.toEqual(rating);
  });

  it("accepts an image without a note", async () => {
    const rateEnvironmentImage = vi.fn(async () => rating);
    const response = await handleCreateEnvironmentReport(multipartRequest(), {
      aiConfig,
      rateEnvironmentImage,
    });

    expect(response.status).toBe(200);
    expect(rateEnvironmentImage).toHaveBeenCalledWith(expect.any(File), aiConfig, undefined);
  });

  it("accepts a real JPEG when the multipart client sends a generic MIME type", async () => {
    const rateEnvironmentImage = vi.fn(async () => rating);
    const jpeg = new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
      "environment.jpeg",
      { type: "application/octet-stream" },
    );
    const response = await handleCreateEnvironmentReport(multipartRequest({}, jpeg), {
      aiConfig,
      rateEnvironmentImage,
    });

    expect(response.status).toBe(200);
    expect(rateEnvironmentImage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "environment.jpeg", type: "image/jpeg" }),
      aiConfig,
      undefined,
    );
  });

  it.each([
    ["an unknown field", multipartRequest({ extra: "true" })],
    ["an oversized note", multipartRequest({ note: "x".repeat(501) })],
    ["a missing image", multipartRequest({}, null)],
  ])("rejects %s", async (_description, request) => {
    const response = await handleCreateEnvironmentReport(request, {
      aiConfig,
      rateEnvironmentImage: vi.fn(async () => rating),
    });

    expect(response.status).toBe(400);
  });

  it("rejects non-multipart requests", async () => {
    const response = await handleCreateEnvironmentReport(
      new Request("http://localhost/api/environment-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "test" }),
      }),
      { aiConfig, rateEnvironmentImage: vi.fn(async () => rating) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Content-Type must be multipart/form-data.",
    });
  });

  it("returns a safe provider error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleCreateEnvironmentReport(multipartRequest(), {
      aiConfig,
      rateEnvironmentImage: vi.fn(async () => {
        throw new Error("provider unavailable");
      }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI image analysis failed.",
      code: "AI_PROVIDER_FAILED",
    });
    consoleError.mockRestore();
  });
});
