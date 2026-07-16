import { describe, expect, it } from "vitest";

import { GET as getDocs } from "@/app/api/docs/route";
import { GET as getOpenApi } from "@/app/api/openapi/route";
import { aiScannerOpenApiDocument } from "@/lib/openapi/ai-scanner-openapi";

describe("AI scanner OpenAPI", () => {
  it("documents a testable multipart scanner operation", () => {
    const operation = aiScannerOpenApiDocument.paths["/api/ai/scans"].post;

    expect(aiScannerOpenApiDocument.openapi).toBe("3.1.0");
    expect(operation.operationId).toBe("analyzeRecyclableImage");
    expect(operation.requestBody.content["multipart/form-data"].schema).toMatchObject({
      required: ["image"],
      properties: { image: { type: "string", format: "binary" } },
    });
    expect(operation.responses["200"].content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/AiScanResponse",
    });
    expect(operation.responses["502"].content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/AiProviderErrorResponse",
    });
  });

  it("serves the OpenAPI document as JSON", async () => {
    const response = getOpenApi();

    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      openapi: "3.1.0",
      paths: { "/api/ai/scans": { post: { operationId: "analyzeRecyclableImage" } } },
    });
  });

  it("serves an interactive Swagger UI wired to the OpenAPI document", async () => {
    const response = getDocs();
    const html = await response.text();

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("SwaggerUIBundle");
    expect(html).toContain('url: "/api/openapi"');
    expect(html).toContain("tryItOutEnabled: true");
  });
});
