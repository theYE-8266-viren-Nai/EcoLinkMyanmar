import { handleRejectReport } from "@/features/reports/api/report-handlers";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleRejectReport(request, id);
}
