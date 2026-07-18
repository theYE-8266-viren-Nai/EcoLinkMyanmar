import { INITIAL_STATE, MATERIALS, PARTNER_CENTERS, materialName, type DropOff, type MaterialSlug } from "@/lib/ecolink-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ImpactDashboardData, ImpactLedgerItem, ImpactMaterial } from "@/features/impact/types";

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

type DashboardDropOffRow = {
  id: string;
  center_id: string;
  material_slug: string;
  weight_kg: number;
  points_awarded: number;
  recorded_at: string;
  recycling_centers: { name: string } | { name: string }[] | null;
};

export function isKnownMaterialSlug(slug: string): slug is MaterialSlug {
  return MATERIALS.some((material) => material.slug === slug);
}

function getCenterName(center: DashboardDropOffRow["recycling_centers"], fallbackCenterId: string) {
  const relation = Array.isArray(center) ? center[0] : center;
  return relation?.name ?? PARTNER_CENTERS.find((item) => item.id === fallbackCenterId)?.name ?? "Partner center";
}

export function buildImpactDashboardData(input: {
  displayName: string;
  memberCode: string;
  dropOffs: Array<{
    id: string;
    centerName: string;
    materialSlug: MaterialSlug;
    weightKg: number;
    points: number;
    recordedAt: string;
  }>;
  spentPoints?: number;
  isDemoFallback?: boolean;
}): ImpactDashboardData {
  const earnedPoints = input.dropOffs.reduce((total, item) => total + item.points, 0);
  const balance = earnedPoints - (input.spentPoints ?? 0);
  const verifiedWeightKg = input.dropOffs.reduce((total, item) => total + item.weightKg, 0);
  const nextMilestone = Math.max(500, Math.ceil((balance + 1) / 500) * 500);
  const milestoneStart = Math.max(0, nextMilestone - 500);
  const pointsToNextMilestone = Math.max(0, nextMilestone - balance);
  const milestoneProgress = ((balance - milestoneStart) / 500) * 100;

  const materialMap = new Map<MaterialSlug, ImpactMaterial>();
  for (const dropOff of input.dropOffs) {
    const current = materialMap.get(dropOff.materialSlug);
    materialMap.set(dropOff.materialSlug, {
      slug: dropOff.materialSlug,
      name: materialName(dropOff.materialSlug),
      weightKg: (current?.weightKg ?? 0) + dropOff.weightKg,
      points: (current?.points ?? 0) + dropOff.points,
    });
  }

  const materialMix = [...materialMap.values()].sort((a, b) => b.weightKg - a.weightKg);
  const ledger: ImpactLedgerItem[] = input.dropOffs
    .slice()
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .map((item) => ({
      id: item.id,
      materialSlug: item.materialSlug,
      materialName: materialName(item.materialSlug),
      centerName: item.centerName,
      weightKg: item.weightKg,
      points: item.points,
      recordedAt: item.recordedAt,
    }));

  return {
    displayName: input.displayName,
    memberCode: input.memberCode,
    balance,
    verifiedWeightKg,
    nextMilestone,
    pointsToNextMilestone,
    milestoneStart,
    milestoneProgress: Math.max(0, Math.min(100, milestoneProgress)),
    topMaterialName: materialMix[0]?.name ?? "None yet",
    materialMix,
    ledger,
    isDemoFallback: input.isDemoFallback ?? false,
  };
}

export function getDemoImpactDashboardData() {
  return buildImpactDashboardData({
    displayName: INITIAL_STATE.user.displayName,
    memberCode: INITIAL_STATE.user.memberCode,
    dropOffs: INITIAL_STATE.dropOffs.map((item: DropOff) => ({
      id: item.id,
      centerName: PARTNER_CENTERS.find((center) => center.id === item.centerId)?.name ?? "Partner center",
      materialSlug: item.materialSlug,
      weightKg: item.weightKg,
      points: item.points,
      recordedAt: item.recordedAt,
    })),
    isDemoFallback: true,
  });
}

export async function getImpactDashboardData(user: SupabaseUser): Promise<ImpactDashboardData> {
  const demoMode = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE !== "false";
  if (demoMode) return getDemoImpactDashboardData();

  const supabase = await createSupabaseServerClient();
  const email = user.email;
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const displayName = metadataName || email?.split("@")[0];
  if (!email || !displayName) return getDemoImpactDashboardData();

  const rpc = supabase.rpc as unknown as (
    name: "ensure_current_profile",
    args: { profile_display_name: string; profile_email: string },
  ) => Promise<{ data: ProfileRow[] | null; error: { message: string } | null }>;
  const { data: profileData, error: profileError } = await rpc("ensure_current_profile", {
    profile_display_name: displayName,
    profile_email: email,
  });
  if (profileError || !profileData?.[0]) return getDemoImpactDashboardData();

  const profile = profileData[0];
  const { data: dropOffRows, error: dropOffError } = await supabase
    .from("verified_drop_offs")
    .select("id, center_id, material_slug, weight_kg, points_awarded, recorded_at, recycling_centers(name)")
    .eq("member_profile_id", profile.profile_id)
    .order("recorded_at", { ascending: false })
    .limit(20);

  if (dropOffError) return getDemoImpactDashboardData();

  const { data: redeemedRows } = await supabase
    .from("point_ledger_entries")
    .select("points")
    .eq("profile_id", profile.profile_id)
    .lt("points", 0);

  const spentPoints = Math.abs(((redeemedRows ?? []) as Array<{ points: number }>).reduce((total, item) => total + item.points, 0));
  const dropOffs: Array<{
    id: string;
    centerName: string;
    materialSlug: MaterialSlug;
    weightKg: number;
    points: number;
    recordedAt: string;
  }> = [];
  for (const item of (dropOffRows ?? []) as DashboardDropOffRow[]) {
    if (!isKnownMaterialSlug(item.material_slug)) continue;
    dropOffs.push({
      id: item.id,
      centerName: getCenterName(item.recycling_centers, item.center_id),
      materialSlug: item.material_slug,
      weightKg: Number(item.weight_kg),
      points: item.points_awarded,
      recordedAt: item.recorded_at,
    });
  }

  return buildImpactDashboardData({
    displayName: profile.display_name,
    memberCode: profile.member_code,
    dropOffs,
    spentPoints,
  });
}
