import { handleClaimReportPoints } from "@/features/reports/api/report-handlers";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleClaimReportPoints(id);
}
