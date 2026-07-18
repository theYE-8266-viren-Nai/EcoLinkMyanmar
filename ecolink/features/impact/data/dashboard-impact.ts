import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sanitizeErrorMessage } from "@/lib/errors";
import type { ImpactDashboardData, ImpactLedgerItem, ImpactReportHistoryItem } from "@/features/impact/types";
import { getPointLedgerBalance } from "@/features/rewards/data/point-ledger-balance";

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: unknown;
  };
};

type ProfileRow = {
  profile_id: string;
  member_code: string;
  display_name: string;
};

type LedgerRow = {
  id: string;
  report_id: string | null;
  points: number;
  entry_type: "earned" | "redeemed" | "adjusted" | "refunded";
  description: string;
  created_at: string;
  environment_reports: { title: string | null; status: "PENDING" | "APPROVED" | "REJECTED"; location_text: string | null } | null;
};

type ReportRow = {
  id: string;
  title: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  location_text: string | null;
  points_awarded: number | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

const EMPTY_MEMBER_CODE = "Member profile pending";

function readDisplayName(user: SupabaseUser) {
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return metadataName || user.email?.split("@")[0] || "EcoLink member";
}

function buildEmptyDashboardData(input: {
  displayName: string;
  memberCode?: string;
  errorMessage?: string;
}): ImpactDashboardData {
  return buildImpactDashboardData({
    displayName: input.displayName,
    memberCode: input.memberCode ?? EMPTY_MEMBER_CODE,
    ledgerEntries: [],
    reports: [],
    errorMessage: input.errorMessage,
  });
}

export function buildImpactDashboardData(input: {
  displayName: string;
  memberCode: string;
  ledgerEntries: ImpactLedgerItem[];
  reports: ImpactReportHistoryItem[];
  authoritativeBalance?: number;
  errorMessage?: string;
}): ImpactDashboardData {
  const ledger = input.ledgerEntries
    .slice()
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const reports = input.reports
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const balance = input.authoritativeBalance ?? ledger.reduce((total, item) => total + item.points, 0);
  const positivePoints = ledger.reduce((total, item) => total + Math.max(0, item.points), 0);
  const approvedReportCount = reports.filter((report) => report.status === "APPROVED").length;
  const pendingReportCount = reports.filter((report) => report.status === "PENDING").length;
  const rejectedReportCount = reports.filter((report) => report.status === "REJECTED").length;
  const nextMilestone = Math.max(500, Math.ceil((Math.max(0, balance) + 1) / 500) * 500);
  const milestoneStart = Math.max(0, nextMilestone - 500);
  const pointsToNextMilestone = Math.max(0, nextMilestone - balance);
  const milestoneProgress = ((balance - milestoneStart) / 500) * 100;

  return {
    displayName: input.displayName,
    memberCode: input.memberCode,
    balance,
    positivePoints,
    approvedReportCount,
    pendingReportCount,
    rejectedReportCount,
    totalReportCount: reports.length,
    nextMilestone,
    pointsToNextMilestone,
    milestoneStart,
    milestoneProgress: Math.max(0, Math.min(100, milestoneProgress)),
    ledger,
    reports,
    errorMessage: input.errorMessage,
  };
}

function toLedgerItem(row: LedgerRow): ImpactLedgerItem {
  const reportTitle = row.environment_reports?.title?.trim();
  return {
    id: row.id,
    reportId: row.report_id,
    title: reportTitle || row.description,
    description: row.description,
    locationText: row.environment_reports?.location_text ?? null,
    points: row.points,
    entryType: row.entry_type,
    reportStatus: row.environment_reports?.status ?? null,
    recordedAt: row.created_at,
  };
}

function toReportHistoryItem(row: ReportRow): ImpactReportHistoryItem {
  return {
    id: row.id,
    title: row.title?.trim() || "Environmental report",
    status: row.status,
    locationText: row.location_text ?? "Location not provided",
    pointsAwarded: row.points_awarded,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
  };
}

export async function getImpactDashboardData(user: SupabaseUser): Promise<ImpactDashboardData> {
  const supabase = await createSupabaseServerClient();
  const displayName = readDisplayName(user);
  if (!user.email) {
    return buildEmptyDashboardData({
      displayName,
      errorMessage: "Your Supabase account needs an email before EcoLink can load dashboard data.",
    });
  }

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: "ensure_current_profile",
    args: { profile_display_name: string; profile_email: string },
  ) => Promise<{ data: ProfileRow[] | null; error: { message: string } | null }>;
  const { data: profileData, error: profileError } = await rpc("ensure_current_profile", {
    profile_display_name: displayName,
    profile_email: user.email,
  });
  if (profileError || !profileData?.[0]) {
    return buildEmptyDashboardData({
      displayName,
      errorMessage: profileError?.message ?? "Your EcoLink profile could not be loaded.",
    });
  }

  const profile = profileData[0];
  const [balanceResult, ledgerResult, reportsResult] = await Promise.all([
    getPointLedgerBalance(supabase, profile.profile_id),
    supabase
      .from("point_ledger_entries")
      .select("id, report_id, points, entry_type, description, created_at, environment_reports(title, status, location_text)")
      .eq("profile_id", profile.profile_id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("environment_reports")
      .select("id, title, status, location_text, points_awarded, created_at, reviewed_at, rejection_reason")
      .eq("reporter_profile_id", profile.profile_id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (balanceResult.error || ledgerResult.error || reportsResult.error) {
    return buildEmptyDashboardData({
      displayName: profile.display_name,
      memberCode: profile.member_code,
      errorMessage: sanitizeErrorMessage(
        balanceResult.error?.message ?? ledgerResult.error?.message ?? reportsResult.error?.message,
        "Dashboard data could not be loaded.",
      ),
    });
  }

  return buildImpactDashboardData({
    displayName: profile.display_name,
    memberCode: profile.member_code,
    authoritativeBalance: balanceResult.data ?? 0,
    ledgerEntries: ((ledgerResult.data ?? []) as LedgerRow[]).map(toLedgerItem),
    reports: ((reportsResult.data ?? []) as ReportRow[]).map(toReportHistoryItem),
  });
}
