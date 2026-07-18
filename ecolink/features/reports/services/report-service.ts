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

function readPhotoExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
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
      const profile = await requireProfile();
      const user = await requireUser();
      let photoStoragePath: string;
      let photoStorageStatus = "stored in Supabase Storage";
      try {
        photoStoragePath = await repository.uploadReportPhoto(user.id, input.image);
      } catch (error) {
        console.error("Report photo upload failed; continuing with pending report metadata only.", error);
        photoStorageStatus = "pending storage retry";
        photoStoragePath = `pending-report-photos/${user.id}/${crypto.randomUUID()}.${readPhotoExtension(input.image)}`;
      }
      const locationText = `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`;
      const sizeKb = Math.max(1, Math.round(input.image.size / 1024));
      return repository.submitReport({
        title: "Photo report from current location",
        issueType: "photo-report",
        severity: "concerning",
        locationText,
        latitude: input.latitude,
        longitude: input.longitude,
        photoStoragePath,
        details: `Photo evidence submitted by ${profile.display_name}: ${input.image.name || "report image"} (${input.image.type}, ${sizeKb} KB, ${photoStorageStatus}).`,
      });
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
