import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateProject } from "next-openapi-gen";

const configPath = path.join(process.cwd(), "openapi-gen.config.mjs");
const outputPath = path.join(process.cwd(), "public", "openapi.json");

await generateProject({ configPath });

const document = JSON.parse(await readFile(outputPath, "utf8"));
document.paths = Object.fromEntries(
  Object.entries(document.paths).flatMap(([routePath, value]) => {
    const normalizedPath = routePath.startsWith("/api/") ? routePath : `/api${routePath}`;

    if (normalizedPath.includes("/app/api/")) {
      return [];
    }

    return [[normalizedPath, value]];
  }),
);

for (const pathItem of Object.values(document.paths)) {
  for (const operation of Object.values(pathItem)) {
    const multipart = operation?.requestBody?.content?.["multipart/form-data"];
    if (multipart?.encoding?.image) {
      delete multipart.encoding.image;
      if (Object.keys(multipart.encoding).length === 0) delete multipart.encoding;
    }
  }
}

document.servers = [{ url: "/", description: "Current EcoLink deployment" }];

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
