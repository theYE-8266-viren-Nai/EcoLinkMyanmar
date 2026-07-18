import type { User } from "@supabase/supabase-js";

import { getPointLedgerBalance } from "@/features/rewards/data/point-ledger-balance";
import type { RewardsPageData, RewardOfferView } from "@/features/rewards/types";
import { PARTNER_REWARDS } from "@/lib/ecolink-data";
import { sanitizeErrorMessage } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProfileRow = {
  profile_id: string;
  member_code: string;
  display_name: string;
};

type OfferRow = {
  id: string;
  title: string;
  description: string;
  township: string;
  points_cost: number;
  stock: number;
};

type RedemptionRow = {
  id: string;
  reward_offer_id: string;
  claim_code: string;
  status: "reserved" | "fulfilled" | "cancelled" | "refunded";
};

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

function readDisplayName(user: User) {
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return metadataName || user.email?.split("@")[0] || "EcoLink member";
}

function toOfferView(row: OfferRow): RewardOfferView {
  const visual = PARTNER_REWARDS.find((reward) => reward.databaseId === row.id);
  return {
    id: visual?.id ?? row.id,
    databaseId: row.id,
    partner: visual?.partner ?? "EcoLink partner",
    township: row.township,
    title: row.title,
    description: row.description,
    points: row.points_cost,
    stock: row.stock,
    imageUrl: visual?.imageUrl ?? "/ecolink-icon-512.png",
  };
}

export async function getRewardsPageData(user: User): Promise<RewardsPageData> {
  const supabase = await createSupabaseServerClient();
  if (!user.email) {
    return { balance: 0, offers: [], redemptions: [], errorMessage: "Your account needs an email before rewards can be loaded." };
  }

  const ensureProfile = supabase.rpc.bind(supabase) as unknown as (
    name: "ensure_current_profile",
    args: { profile_display_name: string; profile_email: string },
  ) => RpcResult<ProfileRow[]>;
  const profileResult = await ensureProfile("ensure_current_profile", {
    profile_display_name: readDisplayName(user),
    profile_email: user.email,
  });

  if (profileResult.error || !profileResult.data?.[0]) {
    return {
      balance: 0,
      offers: [],
      redemptions: [],
      errorMessage: sanitizeErrorMessage(profileResult.error?.message, "Your reward wallet could not be loaded."),
    };
  }

  const [balanceResult, offersResult, redemptionsResult] = await Promise.all([
    getPointLedgerBalance(supabase, profileResult.data[0].profile_id),
    supabase
      .from("partner_reward_offers")
      .select("id, title, description, township, points_cost, stock")
      .eq("is_active", true)
      .order("points_cost", { ascending: true }),
    supabase
      .from("partner_reward_redemptions")
      .select("id, reward_offer_id, claim_code, status")
      .eq("profile_id", profileResult.data[0].profile_id)
      .eq("status", "reserved")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const error = balanceResult.error ?? offersResult.error ?? redemptionsResult.error;
  if (error) {
    const redemptions = ((redemptionsResult.data ?? []) as RedemptionRow[]).map((redemption) => ({
      id: redemption.id,
      rewardOfferId: redemption.reward_offer_id,
      claimCode: redemption.claim_code,
      status: redemption.status,
    }));
    return {
      balance: balanceResult.data ?? 0,
      offers: ((offersResult.data ?? []) as OfferRow[]).map(toOfferView),
      redemptions,
      errorMessage: sanitizeErrorMessage(error.message, "Your reward wallet could not be loaded."),
    };
  }

  return {
    balance: balanceResult.data ?? 0,
    offers: ((offersResult.data ?? []) as OfferRow[]).map(toOfferView),
    redemptions: ((redemptionsResult.data ?? []) as RedemptionRow[]).map((redemption) => ({
      id: redemption.id,
      rewardOfferId: redemption.reward_offer_id,
      claimCode: redemption.claim_code,
      status: redemption.status,
    })),
  };
}
