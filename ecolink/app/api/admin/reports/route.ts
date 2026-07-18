import { handleListPendingReports } from "@/features/reports/api/report-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleListPendingReports(request);
}
