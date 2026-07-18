import { MemberReportHistoryPage } from "@/features/reports/components/member-report-history-page";
import { createReportWorkflowService, ReportWorkflowError } from "@/features/reports/services/report-service";
import type { MemberReport } from "@/features/reports/types";

export default async function ReportHistoryPage() {
  let initialReports: MemberReport[] = [];
  let initialError: string | undefined;

  try {
    const service = await createReportWorkflowService();
    initialReports = (await service.listMemberReports()) as MemberReport[];
  } catch (error) {
    initialError = error instanceof ReportWorkflowError ? error.message : "Reports could not be loaded.";
  }

  return <MemberReportHistoryPage initialError={initialError} initialReports={initialReports} />;
}
