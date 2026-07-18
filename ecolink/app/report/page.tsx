import { MemberReportPage } from "@/features/reports/components/member-report-page";
import { createReportWorkflowService, ReportWorkflowError } from "@/features/reports/services/report-service";
import type { MemberReport } from "@/features/reports/types";

export default async function ReportPage() {
  let initialReports: MemberReport[] = [];
  let initialError: string | undefined;

  try {
    const service = await createReportWorkflowService();
    initialReports = (await service.listMemberReports()) as MemberReport[];
  } catch (error) {
    initialError = error instanceof ReportWorkflowError ? error.message : "Reports could not be loaded.";
  }

  return <MemberReportPage initialError={initialError} initialReports={initialReports} />;
}
