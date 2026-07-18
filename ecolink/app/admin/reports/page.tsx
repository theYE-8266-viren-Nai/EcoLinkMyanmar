import { redirect } from "next/navigation";

import { AdminReportsPage } from "@/features/reports/components/admin-reports-page";
import { createReportWorkflowService, ReportWorkflowError } from "@/features/reports/services/report-service";
import type { AdminPendingReport } from "@/features/reports/types";

export const dynamic = "force-dynamic";

export default async function AdminReportsRoutePage() {
  let initialReports: AdminPendingReport[] = [];
  let initialError: string | undefined;

  try {
    const service = await createReportWorkflowService();
    initialReports = (await service.listPendingReports()) as AdminPendingReport[];
  } catch (error) {
    if (error instanceof ReportWorkflowError && error.status === 401) {
      redirect("/sign-in?redirect_url=/admin/reports");
    }
    if (error instanceof ReportWorkflowError && error.status === 403) {
      redirect("/dashboard");
    }
    console.error(error);
    initialError = error instanceof ReportWorkflowError ? error.message : "Pending reports could not be loaded.";
  }

  return <AdminReportsPage initialError={initialError} initialReports={initialReports} />;
}
