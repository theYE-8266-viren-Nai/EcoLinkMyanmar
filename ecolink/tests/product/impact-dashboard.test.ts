import { describe, expect, it } from "vitest";

import { buildImpactDashboardData } from "@/features/impact/data/dashboard-impact";

describe("impact dashboard read model", () => {
  it("uses point ledger rows for balance and report rows for history counts", () => {
    const dashboard = buildImpactDashboardData({
      displayName: "Mya Thiri",
      memberCode: "ECO-MM-1048",
      ledgerEntries: [
        {
          id: "earned",
          reportId: "report-approved",
          title: "Blocked drain in Lanmadaw",
          description: "Approved community report",
          locationText: "Lanmadaw",
          points: 50,
          entryType: "earned",
          reportStatus: "APPROVED",
          recordedAt: "2026-07-16T10:00:00.000Z",
        },
        {
          id: "redeemed",
          reportId: null,
          title: "Partner reward reservation",
          description: "Partner reward reservation",
          locationText: null,
          points: -20,
          entryType: "redeemed",
          reportStatus: null,
          recordedAt: "2026-07-17T10:00:00.000Z",
        },
      ],
      reports: [
        {
          id: "report-pending",
          title: "Plastic dump near Hledan Market",
          status: "PENDING",
          locationText: "Hledan",
          pointsAwarded: null,
          createdAt: "2026-07-18T00:00:00.000Z",
          reviewedAt: null,
          rejectionReason: null,
        },
        {
          id: "report-approved",
          title: "Blocked drain in Lanmadaw",
          status: "APPROVED",
          locationText: "Lanmadaw",
          pointsAwarded: 50,
          createdAt: "2026-07-16T00:00:00.000Z",
          reviewedAt: "2026-07-16T10:00:00.000Z",
          rejectionReason: null,
        },
        {
          id: "report-rejected",
          title: "Duplicate burning report",
          status: "REJECTED",
          locationText: "Tamwe",
          pointsAwarded: null,
          createdAt: "2026-07-15T00:00:00.000Z",
          reviewedAt: "2026-07-15T10:00:00.000Z",
          rejectionReason: "Duplicate report.",
        },
      ],
    });

    expect(dashboard.balance).toBe(30);
    expect(dashboard.positivePoints).toBe(50);
    expect(dashboard.approvedReportCount).toBe(1);
    expect(dashboard.pendingReportCount).toBe(1);
    expect(dashboard.rejectedReportCount).toBe(1);
    expect(dashboard.ledger.map((item) => item.id)).toEqual(["redeemed", "earned"]);
  });

  it("shows a zero state when there are no reports or ledger entries", () => {
    const dashboard = buildImpactDashboardData({
      displayName: "New Member",
      memberCode: "ECO-MM-0001",
      ledgerEntries: [],
      reports: [],
    });

    expect(dashboard.balance).toBe(0);
    expect(dashboard.positivePoints).toBe(0);
    expect(dashboard.totalReportCount).toBe(0);
    expect(dashboard.ledger).toEqual([]);
  });
});
