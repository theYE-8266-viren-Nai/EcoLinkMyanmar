import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ReportRepository } from "@/features/reports/data/report-repository";
import type { SubmitReportInput } from "@/features/reports/schemas/report";

export class ReportWorkflowError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type ReportWorkflowService = {
  submitReport(input: SubmitReportInput): Promise<unknown>;
  listMemberReports(): Promise<unknown>;
  listPendingReports(): Promise<unknown>;
  approveReport(reportId: string): Promise<void>;
  rejectReport(reportId: string, reason?: string): Promise<void>;
  claimReportPoints(reportId: string): Promise<unknown>;
};

async function createDefaultRepository() {
  return new ReportRepository(await createSupabaseServerClient());
}

export async function createReportWorkflowService(): Promise<ReportWorkflowService> {
  const repository = await createDefaultRepository();

  async function requireUser() {
    const user = await repository.getCurrentUser();
    if (!user) throw new ReportWorkflowError("Sign in to continue.", 401);
    return user;
  }

  async function requireProfile() {
    const user = await requireUser();
    return repository.ensureCurrentProfile(user);
  }

  async function requireAdmin() {
    await requireProfile();
    if (!(await repository.isCurrentUserAdmin())) {
      throw new ReportWorkflowError("Admin access required.", 403);
    }
  }

  return {
    async submitReport(input) {
      await requireProfile();
      return repository.submitReport(input);
    },
    async listMemberReports() {
      const profile = await requireProfile();
      return repository.listCurrentMemberReports(profile.profile_id);
    },
    async listPendingReports() {
      await requireAdmin();
      return repository.listPendingReports();
    },
    async approveReport(reportId) {
      await requireAdmin();
      await repository.approveReport(reportId);
    },
    async rejectReport(reportId, reason) {
      await requireAdmin();
      await repository.rejectReport(reportId, reason);
    },
    async claimReportPoints(reportId) {
      await requireUser();
      return repository.claimReportPoints(reportId);
    },
  };
}
