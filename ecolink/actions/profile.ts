"use server";

import { currentUser } from "@clerk/nextjs/server";

import { createClerkSupabaseServerClient } from "@/lib/supabase-clerk";

type ProfileRow = { profile_id: string; member_code: string; display_name: string };

export async function syncCurrentProfile() {
  const [user, supabase] = await Promise.all([currentUser(), createClerkSupabaseServerClient()]);
  if (!user || !supabase) return { ok: false as const, error: "Sign in to create your EcoLink profile." };

  const email = user.primaryEmailAddress?.emailAddress;
  const displayName = user.fullName ?? user.firstName ?? email?.split("@")[0];
  if (!email || !displayName) return { ok: false as const, error: "Your Clerk account needs a name and primary email." };

  const rpc = supabase.rpc as unknown as (name: "ensure_current_profile", args: { profile_display_name: string; profile_email: string }) => Promise<{ data: ProfileRow[] | null; error: { message: string } | null }>;
  const { data, error } = await rpc("ensure_current_profile", { profile_display_name: displayName, profile_email: email });
  if (error || !data?.[0]) return { ok: false as const, error: error?.message ?? "Your EcoLink profile could not be prepared." };
  return { ok: true as const, profile: data[0] };
}
