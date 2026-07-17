"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { createClerkSupabaseServerClient } from "@/lib/supabase-clerk";

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export async function redeemPartnerReward(rewardId: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false as const, error: "Sign in to reserve a reward." };

  const parsed = z.uuid().safeParse(rewardId);
  if (!parsed.success) return { ok: false as const, error: "This reward identifier is invalid." };
  const supabase = await createClerkSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Sign in to reserve a reward." };
  const rpc = supabase.rpc as unknown as (name: "redeem_partner_reward", args: { reward_id: string }) => RpcResult<Array<{ claim_code: string }>>;
  const { data, error } = await rpc("redeem_partner_reward", { reward_id: parsed.data });
  if (error || !data?.[0]) return { ok: false as const, error: error?.message ?? "The reward could not be reserved." };
  return { ok: true as const, claimCode: data[0].claim_code };
}
