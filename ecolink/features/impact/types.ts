import type { MaterialSlug } from "@/lib/ecolink-data";

export type ImpactMaterial = {
  slug: MaterialSlug;
  name: string;
  weightKg: number;
  points: number;
};

export type ImpactLedgerItem = {
  id: string;
  materialSlug: MaterialSlug;
  materialName: string;
  centerName: string;
  weightKg: number;
  points: number;
  recordedAt: string;
};

export type ImpactDashboardData = {
  displayName: string;
  memberCode: string;
  balance: number;
  verifiedWeightKg: number;
  nextMilestone: number;
  pointsToNextMilestone: number;
  milestoneStart: number;
  milestoneProgress: number;
  topMaterialName: string;
  materialMix: ImpactMaterial[];
  ledger: ImpactLedgerItem[];
  isDemoFallback: boolean;
};
