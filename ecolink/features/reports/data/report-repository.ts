import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { AdminPendingReport, MemberReport, ReportClaimResult } from "@/features/reports/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ReportRow = Database["public"]["Tables"]["environment_reports"]["Row"];
type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type EnsureProfileRow = {
  profile_id: string;
  member_code: string;
  display_name: string;
};

type SubmitReportRpcRow = {
  report_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
};

type ClaimReportRpcRow = {
  report_id: string;
  points_awarded: number;
  claimed_at: string;
};

function readDisplayName(user: User) {
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return metadataName || user.email?.split("@")[0] || "EcoLink member";
}

function toMemberReport(row: ReportRow): MemberReport {
  return {
    id: row.id,
    title: row.title,
    issueType: row.issue_type ?? "environment-report",
    severity: row.severity ?? "concerning",
    locationText: row.location_text ?? "Location not provided",
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    isClaimed: row.is_claimed,
    claimedAt: row.claimed_at,
    pointsAwarded: row.points_awarded,
  };
}

export class ReportRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getCurrentUser() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    return user;
  }

  async ensureCurrentProfile(user: User) {
    if (!user.email) throw new Error("Your Supabase account needs a primary email.");
    const rpc = this.supabase.rpc as unknown as (
      name: "ensure_current_profile",
      args: { profile_display_name: string; profile_email: string },
    ) => RpcResult<EnsureProfileRow[]>;
    const { data, error } = await rpc("ensure_current_profile", {
      profile_display_name: readDisplayName(user),
      profile_email: user.email,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "Your EcoLink profile could not be prepared.");
    return data[0];
  }

  async isCurrentUserAdmin() {
    const rpc = this.supabase.rpc as unknown as (name: "current_profile_is_admin") => RpcResult<boolean>;
    const { data, error } = await rpc("current_profile_is_admin");
    if (error) throw new Error(error.message);
    return data === true;
  }

  async submitReport(input: {
    title: string;
    issueType: string;
    severity: string;
    locationText: string;
    details?: string;
  }) {
    const rpc = this.supabase.rpc as unknown as (
      name: "submit_environment_report",
      args: {
        report_title: string;
        report_issue_type: string;
        report_severity: string;
        report_location_text: string;
        report_details?: string | null;
      },
    ) => RpcResult<SubmitReportRpcRow[]>;
    const { data, error } = await rpc("submit_environment_report", {
      report_title: input.title,
      report_issue_type: input.issueType,
      report_severity: input.severity,
      report_location_text: input.locationText,
      report_details: input.details ?? null,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "The report could not be submitted.");
    return data[0];
  }

  async listCurrentMemberReports(profileId: string) {
    const { data, error } = await this.supabase
      .from("environment_reports")
      .select("*")
      .eq("reporter_profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as ReportRow[]).map(toMemberReport);
  }

  async listPendingReports() {
    const { data, error } = await this.supabase
      .from("environment_reports")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const reports = (data ?? []) as ReportRow[];
    const profileIds = [...new Set(reports.map((report) => report.reporter_profile_id).filter((id): id is string => Boolean(id)))];
    const profileMap = new Map<string, Pick<ProfileRow, "display_name" | "email">>();
    if (profileIds.length > 0) {
      const { data: profiles, error: profileError } = await this.supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", profileIds);
      if (profileError) throw new Error(profileError.message);
      for (const profile of (profiles ?? []) as Array<Pick<ProfileRow, "id" | "display_name" | "email">>) {
        profileMap.set(profile.id, { display_name: profile.display_name, email: profile.email });
      }
    }

    return reports.map((report): AdminPendingReport => {
      const submittedBy = report.reporter_profile_id ? profileMap.get(report.reporter_profile_id) : undefined;
      return {
        ...toMemberReport(report),
        submittedBy: {
          displayName: submittedBy?.display_name ?? "Unknown member",
          email: submittedBy?.email ?? "unknown@example.com",
        },
      };
    });
  }

  async approveReport(reportId: string) {
    const rpc = this.supabase.rpc as unknown as (name: "approve_environment_report", args: { target_report_id: string }) => RpcResult<string>;
    const { error } = await rpc("approve_environment_report", { target_report_id: reportId });
    if (error) throw new Error(error.message);
  }

  async rejectReport(reportId: string, reason?: string) {
    const rpc = this.supabase.rpc as unknown as (
      name: "reject_environment_report",
      args: { target_report_id: string; reason?: string | null },
    ) => RpcResult<string>;
    const { error } = await rpc("reject_environment_report", { target_report_id: reportId, reason: reason ?? null });
    if (error) throw new Error(error.message);
  }

  async claimReportPoints(reportId: string): Promise<ReportClaimResult> {
    const rpc = this.supabase.rpc as unknown as (
      name: "claim_environment_report_points",
      args: { target_report_id: string },
    ) => RpcResult<ClaimReportRpcRow[]>;
    const { data, error } = await rpc("claim_environment_report_points", { target_report_id: reportId });
    if (error || !data?.[0]) throw new Error(error?.message ?? "Report points could not be claimed.");
    return {
      reportId: data[0].report_id,
      pointsAwarded: data[0].points_awarded,
      claimedAt: data[0].claimed_at,
    };
  }
}
