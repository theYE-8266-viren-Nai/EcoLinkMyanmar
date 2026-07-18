export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ImpactLedgerItem = {
  id: string;
  reportId: string | null;
  title: string;
  description: string;
  locationText: string | null;
  points: number;
  entryType: "earned" | "redeemed" | "adjusted" | "refunded";
  reportStatus: ReportStatus | null;
  recordedAt: string;
};

export type ImpactReportHistoryItem = {
  id: string;
  title: string;
  status: ReportStatus;
  locationText: string;
  pointsAwarded: number | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export type ImpactDashboardData = {
  displayName: string;
  memberCode: string;
  balance: number;
  positivePoints: number;
  approvedReportCount: number;
  pendingReportCount: number;
  rejectedReportCount: number;
  totalReportCount: number;
  nextMilestone: number;
  pointsToNextMilestone: number;
  milestoneStart: number;
  milestoneProgress: number;
  ledger: ImpactLedgerItem[];
  reports: ImpactReportHistoryItem[];
  errorMessage?: string;
};
