import { handleListMemberReports, handleSubmitReport } from "@/features/reports/api/report-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleListMemberReports(request);
}

export async function POST(request: Request) {
  return handleSubmitReport(request);
}
