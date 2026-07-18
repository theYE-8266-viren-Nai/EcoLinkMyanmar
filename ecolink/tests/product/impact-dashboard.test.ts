import { describe, expect, it } from "vitest";

import { buildImpactDashboardData } from "@/features/impact/data/dashboard-impact";

describe("impact dashboard read model", () => {
  it("aggregates verified kilograms, point balance, and material mix", () => {
    const dashboard = buildImpactDashboardData({
      displayName: "Mya Thiri",
      memberCode: "ECO-MM-1048",
      dropOffs: [
        { id: "one", centerName: "Hlaing EcoPoint", materialSlug: "pet-plastic", weightKg: 3, points: 150, recordedAt: "2026-07-14T09:30:00.000Z" },
        { id: "two", centerName: "Lanmadaw Material Bank", materialSlug: "paper", weightKg: 6, points: 120, recordedAt: "2026-07-09T10:15:00.000Z" },
        { id: "three", centerName: "Hlaing EcoPoint", materialSlug: "pet-plastic", weightKg: 5, points: 250, recordedAt: "2026-06-28T08:45:00.000Z" },
        { id: "four", centerName: "Yankin Circular Center", materialSlug: "e-waste", weightKg: 2, points: 160, recordedAt: "2026-06-18T12:00:00.000Z" },
      ],
    });

    expect(dashboard.balance).toBe(680);
    expect(dashboard.verifiedWeightKg).toBe(16);
    expect(dashboard.pointsToNextMilestone).toBe(320);
    expect(dashboard.materialMix).toMatchObject([
      { slug: "pet-plastic", weightKg: 8, points: 400 },
      { slug: "paper", weightKg: 6, points: 120 },
      { slug: "e-waste", weightKg: 2, points: 160 },
    ]);
  });

  it("subtracts redeemed points from the dashboard balance without changing earned activity", () => {
    const dashboard = buildImpactDashboardData({
      displayName: "Mya Thiri",
      memberCode: "ECO-MM-1048",
      spentPoints: 150,
      dropOffs: [
        { id: "one", centerName: "Hlaing EcoPoint", materialSlug: "pet-plastic", weightKg: 3, points: 150, recordedAt: "2026-07-14T09:30:00.000Z" },
        { id: "two", centerName: "Lanmadaw Material Bank", materialSlug: "paper", weightKg: 6, points: 120, recordedAt: "2026-07-09T10:15:00.000Z" },
      ],
    });

    expect(dashboard.balance).toBe(120);
    expect(dashboard.verifiedWeightKg).toBe(9);
    expect(dashboard.ledger).toHaveLength(2);
  });
});
