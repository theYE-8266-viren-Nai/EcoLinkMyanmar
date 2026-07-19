import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ReportRepository } from "@/features/reports/data/report-repository";
import type { SubmitReportInput } from "@/features/reports/schemas/report";
import { getAiScannerConfig } from "@/lib/services/ai-scanner-config";
import type { EnvironmentReportRating } from "@/schemas/environment-report-rating";

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
};

async function createDefaultRepository() {
  return new ReportRepository(await createSupabaseServerClient());
}

function readPhotoExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/**
 * Attempts to run an AI environment rating on the submitted photo.
 * Returns null (does NOT throw) if the AI service is unavailable or misconfigured,
 * so the report submission always succeeds regardless of AI health.
 */
async function tryRateEnvironmentImage(file: File): Promise<EnvironmentReportRating | null> {
  try {
    const config = getAiScannerConfig();
    if (!config.openRouterApiKey) return null;

    const { rateEnvironmentImageWithOpenRouter } = await import(
      "@/lib/services/environment-report-rating"
    );
    return await rateEnvironmentImageWithOpenRouter(file, {
      ...config,
      model: process.env.AI_ENVIRONMENT_REPORT_MODEL ?? config.model,
      maxUploadMb: Number(process.env.AI_ENVIRONMENT_REPORT_MAX_UPLOAD_MB ?? config.maxUploadMb),
    });
  } catch (error) {
    console.warn("AI environment rating skipped during report submission:", error instanceof Error ? error.message : error);
    return null;
  }
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

      // Run AI measurement non-blocking — a failure never prevents report submission.
      const aiRating = await tryRateEnvironmentImage(input.image);

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
        // AI enrichment fields — null when AI was unavailable.
        aiDirtinessScore: aiRating?.dirtinessScore ?? undefined,
        aiConfidence: aiRating?.confidence ?? undefined,
        aiReasoning: aiRating?.reasoning ?? undefined,
        aiWarnings: aiRating?.warnings ?? undefined,
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
  };
}

