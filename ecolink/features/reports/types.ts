export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MemberReport = {
  id: string;
  title: string;
  issueType: string;
  severity: string;
  locationText: string;
  details: string | null;
  photoStoragePath: string | null;
  photoUrl: string | null;
  status: ReportStatus;
  createdAt: string;
  approvedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  pointsAwarded: number | null;
};

export type AdminPendingReport = MemberReport & {
  submittedBy: {
    displayName: string;
    email: string;
  };
};
