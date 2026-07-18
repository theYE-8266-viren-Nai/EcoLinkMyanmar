import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

const LEDGER_PAGE_SIZE = 1_000;

export type PointLedgerBalanceResult =
  | { data: number; error: null }
  | { data: null; error: { message: string } };

/**
 * Reads the member's complete RLS-protected point ledger. This works before
 * and after the balance RPC migration is deployed and avoids the Data API's
 * configured maximum-row limit by paging through the entries.
 */
export async function getPointLedgerBalance(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<PointLedgerBalanceResult> {
  let balance = 0;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("point_ledger_entries")
      .select("points")
      .eq("profile_id", profileId)
      .range(from, from + LEDGER_PAGE_SIZE - 1);

    if (error) return { data: null, error: { message: error.message } };

    const entries = (data ?? []) as Array<{ points: number }>;
    balance += entries.reduce((total, entry) => total + entry.points, 0);

    if (entries.length < LEDGER_PAGE_SIZE) return { data: balance, error: null };
    from += LEDGER_PAGE_SIZE;
  }
}
