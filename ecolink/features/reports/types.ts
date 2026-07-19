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
  /** AI environment dirtiness score (1 = clean, 10 = very dirty). Null if AI was unavailable at submission time. */
  aiDirtinessScore: number | null;
  /** AI confidence in the dirtiness score (0–1). Null if AI was unavailable. */
  aiConfidence: number | null;
  /** AI reasoning sentence for the dirtiness score. Null if AI was unavailable. */
  aiReasoning: string | null;
  /** AI-detected warnings about the image quality or content. Empty when AI was unavailable. */
  aiWarnings: string[];
};

export type AdminPendingReport = MemberReport & {
  submittedBy: {
    displayName: string;
    email: string;
  };
};

