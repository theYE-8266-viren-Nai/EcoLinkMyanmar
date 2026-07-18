"use server";

import { z } from "zod";

import { getPointLedgerBalance } from "@/features/rewards/data/point-ledger-balance";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sanitizeErrorMessage } from "@/lib/errors";

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export async function redeemPartnerReward(rewardId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in to reserve a reward." };

  const parsed = z.guid().safeParse(rewardId);
  if (!parsed.success) return { ok: false as const, error: "This reward identifier is invalid." };
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: "redeem_partner_reward",
    args: { reward_id: string },
  ) => RpcResult<Array<{ redemption_id: string; claim_code: string; balance?: number }>>;
  const { data, error } = await rpc("redeem_partner_reward", { reward_id: parsed.data });
  if (error || !data?.[0]) return { ok: false as const, error: sanitizeErrorMessage(error?.message, "The reward could not be reserved.") };

  let balance = data[0].balance;
  if (typeof balance !== "number") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const profileRow = profile as { id: string } | null;
    if (profileRow) {
      const balanceResult = await getPointLedgerBalance(supabase, profileRow.id);
      balance = balanceResult.data ?? undefined;
    }
  }

  return {
    ok: true as const,
    redemptionId: data[0].redemption_id,
    claimCode: data[0].claim_code,
    balance: balance ?? null,
  };
}
