import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260717123120_ecolink_product_pivot.sql"),
  "utf8",
);
const profileRpcMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260717133112_clerk_third_party_auth.sql"),
  "utf8",
);
const supabaseAuthMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718120000_supabase_native_auth.sql"),
  "utf8",
);
const reportWorkflowMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718153000_report_approval_workflow.sql"),
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

  it("can reconcile an existing partial pivot without duplicate policies", () => {
    expect(migration).toContain("to_regclass('public.center_staff_assignments')");
    expect(migration).toContain('drop policy if exists "Staff can read their assignments"');
  });

  it("does not expose privileged RPCs to anonymous callers", () => {
    expect(migration).toContain("revoke all on function public.record_center_drop_off(text, text, numeric) from public, anon");
    expect(migration).toContain("revoke all on function public.redeem_partner_reward(uuid) from public, anon");
    expect(migration).toContain("revoke all on function public.fulfill_partner_reward(text) from public, anon");
  });

  it("uses the Supabase Auth user id for authorization", () => {
    expect(migration).toContain("select nullif(auth.jwt()->>'sub', '')");
    expect(migration).not.toContain("auth.uid()");
    expect(migration).toContain("alter column auth_user_id type text");
    expect(supabaseAuthMigration).toContain("select auth.uid()::text");
    expect(profileRpcMigration).toContain("alter table public.profiles enable row level security");
  });

  it("requires an active center assignment for the staff dashboard", () => {
    expect(profileRpcMigration).toContain("create or replace function public.get_current_staff_center()");
    expect(profileRpcMigration).toContain("assignment.is_active");
    expect(profileRpcMigration).toContain("revoke all on function public.get_current_staff_center() from public, anon");
  });

  it("protects report review and point claiming transitions", () => {
    expect(reportWorkflowMigration).toContain("create type public.report_status as enum ('PENDING', 'APPROVED', 'REJECTED')");
    expect(reportWorkflowMigration).toContain("alter table public.environment_reports enable row level security");
    expect(reportWorkflowMigration).toContain("profile.app_role = 'admin'");
    expect(reportWorkflowMigration).toContain("if not public.current_profile_is_admin() then");
    expect(reportWorkflowMigration).toContain("where id = target_report_id\n    and status = 'PENDING'::public.report_status");
    expect(reportWorkflowMigration).toContain("if report_row.status <> 'APPROVED'::public.report_status then");
    expect(reportWorkflowMigration).toContain("for update");
    expect(reportWorkflowMigration).toContain("on conflict (report_id) where report_id is not null do nothing");
  });

  it("does not expose report workflow RPCs to anonymous callers", () => {
    expect(reportWorkflowMigration).toContain("revoke all on function public.submit_environment_report(text, text, text, text, text) from public, anon");
    expect(reportWorkflowMigration).toContain("revoke all on function public.approve_environment_report(uuid) from public, anon");
    expect(reportWorkflowMigration).toContain("revoke all on function public.reject_environment_report(uuid, text) from public, anon");
    expect(reportWorkflowMigration).toContain("revoke all on function public.claim_environment_report_points(uuid) from public, anon");
  });
});
