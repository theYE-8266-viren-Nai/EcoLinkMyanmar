import { defineConfig } from "next-openapi-gen";

export default defineConfig({
  openapi: "3.1.0",
  info: {
    title: "EcoLink API",
    version: "1.0.0",
    description:
      "Public EcoLink APIs for AI recyclable-item and environment image analysis.",
  },
  apiDir: "./app/api",
  routerType: "app",
  schemaDir: ["./schemas", "./features"],
  schemaType: ["zod", "typescript"],
  outputFile: "openapi.json",
  outputDir: "./public",
  docsUrl: "openapi",
  includeOpenApiRoutes: false,
  ignoreRoutes: [],
  debug: false,
});
