"use server";

import { z } from "zod";

import { MATERIALS } from "@/lib/ecolink-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

const materialSlugs = MATERIALS.map((material) => material.slug) as [string, ...string[]];

const dropOffSchema = z.object({
  memberCode: z.string().trim().min(4).max(32),
  materialSlug: z.enum(materialSlugs),
  weightKg: z.number().positive().max(500),
});

export async function recordCenterDropOff(input: unknown) {
  const parsed = dropOffSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the member code, material, and measured weight." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in with a staff account to record a drop-off." };

  const rpc = supabase.rpc as unknown as (name: "record_center_drop_off", args: { member_code: string; material_slug: string; weight_kg: number }) => RpcResult<Array<{ points_awarded: number }>>;
  const { data, error } = await rpc("record_center_drop_off", {
    member_code: parsed.data.memberCode,
    material_slug: parsed.data.materialSlug,
    weight_kg: parsed.data.weightKg,
  });
  if (error || !data?.[0]) return { ok: false as const, error: error?.message ?? "The drop-off could not be recorded." };
  return { ok: true as const, points: data[0].points_awarded };
}

export async function fulfillPartnerReward(claimCode: string) {
  const parsed = z.string().trim().min(6).max(32).safeParse(claimCode);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid reward claim code." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in with a staff account to fulfill rewards." };
  const rpc = supabase.rpc as unknown as (name: "fulfill_partner_reward", args: { reward_claim_code: string }) => RpcResult<string>;
  const { error } = await rpc("fulfill_partner_reward", { reward_claim_code: parsed.data });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
