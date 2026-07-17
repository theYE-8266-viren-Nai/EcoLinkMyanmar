import { handleCreateEnvironmentReport } from "@/features/environment-reports/api/environment-report-handlers";

export const runtime = "nodejs";

/**
 * Rate an environment image
 * @summary Rate an environment image
 * @description Accepts one image and an optional note. AI returns a 1–10 dirtiness rating. Nothing is saved.
 * @tag Environment Reports
 * @body CreateEnvironmentReportRequestBodySchema
 * @contentType multipart/form-data
 * @response 200:EnvironmentReportResponseSchema:The AI environment rating.
 * @add 400:ErrorResponseSchema:Invalid multipart request or image or note.
 * @add 500:ErrorResponseSchema:Internal processing failure.
 * @add 502:AiProviderErrorResponseSchema:AI dirtiness rating failure.
 * @openapi
 */
export async function POST(request: Request) {
  return handleCreateEnvironmentReport(request);
}
