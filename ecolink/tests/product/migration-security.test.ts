import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260717123120_ecolink_product_pivot.sql"),
  "utf8",
);

describe("EcoLink Supabase migration", () => {
  it("enables RLS on every new user-data table", () => {
    for (const table of ["center_staff_assignments", "verified_drop_offs", "point_ledger_entries", "partner_reward_redemptions", "user_notifications"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("checks an active staff assignment before awarding points", () => {
    expect(migration).toContain("where assignment.profile_id = staff_profile_id");
    expect(migration).toContain("and assignment.is_active");
    expect(migration).toContain("if assigned_center_id is null then");
  });

  it("does not expose privileged RPCs to anonymous callers", () => {
    expect(migration).toContain("revoke all on function public.record_center_drop_off(text, text, numeric) from public, anon");
    expect(migration).toContain("revoke all on function public.redeem_partner_reward(uuid) from public, anon");
    expect(migration).toContain("revoke all on function public.fulfill_partner_reward(text) from public, anon");
  });
});
