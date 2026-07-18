import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

type OpenApiDocument = {
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, { properties?: Record<string, unknown> }>;
  };
};

type OpenApiOperation = {
  summary?: string;
  requestBody?: {
    content: Record<
      string,
      { schema: { $ref: string }; encoding?: Record<string, { contentType?: string }> }
    >;
  };
  responses: Record<string, { content: { "application/json": { schema: { $ref: string } } } }>;
  parameters?: Array<{ name: string }>;
};

let document: OpenApiDocument;

beforeAll(async () => {
  execFileSync(process.execPath, ["./scripts/generate-openapi.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  document = JSON.parse(
    await readFile(path.join(process.cwd(), "public/openapi.json"), "utf8"),
  );
});

describe("generated OpenAPI document", () => {
  it("documents the AI scanner multipart upload", () => {
    const operation = document.paths["/api/ai/scans"].post!;
    const requestBody = operation.requestBody!;

    expect(document.openapi).toBe("3.1.0");
    expect(Object.keys(document.paths)).toEqual([
      "/api/admin/reports",
      "/api/admin/reports/{id}/approve",
      "/api/admin/reports/{id}/reject",
      "/api/ai/scans",
      "/api/collector-vehicles/location",
      "/api/environment-reports",
      "/api/faq-assistant",
      "/api/faq-assistant/feedback",
      "/api/map/waste",
      "/api/reports",
    ]);
    expect(document.paths).not.toHaveProperty("/api/reports/{id}/claim");
    expect(operation.summary).toBe("Analyze a recyclable-items image");
    expect(requestBody.content["multipart/form-data"].schema.$ref).toContain(
      "AiScanRequestBodySchema",
    );
    expect(operation.responses["502"].content["application/json"].schema.$ref).toContain(
      "AiProviderErrorResponseSchema",
    );
  });

  it("documents the environment report multipart body fields", () => {
    const operation = document.paths["/api/environment-reports"].post!;
    const requestBody = operation.requestBody!;
    const requestBodySchemaRef = requestBody.content["multipart/form-data"].schema.$ref;
    const schemaName = requestBodySchemaRef.split("/").at(-1);
    const requestBodySchema = document.components.schemas[schemaName!];

    expect(operation.summary).toBe("Rate an environment image");
    expect(requestBodySchema.properties).toHaveProperty("image");
    expect(requestBodySchema.properties).toHaveProperty("note");
    expect(Object.keys(requestBodySchema.properties ?? {})).toEqual(["image", "note"]);
    expect(requestBody.content["multipart/form-data"].encoding).toBeUndefined();
    expect(operation.responses["200"].content["application/json"].schema.$ref).toContain(
      "EnvironmentReportResponseSchema",
    );
    expect(Object.keys(operation.responses)).toEqual(["200", "400", "500", "502"]);
    expect(document.paths["/api/environment-reports"]).not.toHaveProperty("get");
  });
});
