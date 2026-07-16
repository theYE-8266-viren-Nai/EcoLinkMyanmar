import { NextResponse } from "next/server";

import { aiScannerOpenApiDocument } from "@/lib/openapi/ai-scanner-openapi";

export function GET() {
  return NextResponse.json(aiScannerOpenApiDocument, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
