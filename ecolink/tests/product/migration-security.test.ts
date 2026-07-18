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
const profileRpcRepairMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718063419_repair_ensure_current_profile.sql"),
  "utf8",
);
const reportWorkflowMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718153000_report_approval_workflow.sql"),
  "utf8",
);
const reportPhotoLocationMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718161000_report_photo_location_submission.sql"),
  "utf8",
);
const authenticatedReportSelectRepairMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718064724_repair_environment_reports_authenticated_select.sql"),
  "utf8",
);
const reportRpcAmbiguityRepairMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718065705_repair_report_rpc_ambiguous_columns.sql"),
  "utf8",
);
const reportApprovalPointAwardMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718172000_award_report_points_on_admin_approval.sql"),
  "utf8",
);
const approvedReportPointBackfillMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718184500_backfill_approved_report_points.sql"),
  "utf8",
);
const welcomePointsMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718193000_award_welcome_points_on_profile_create.sql"),
  "utf8",
);
const welcomePointsBackfillMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718194000_backfill_welcome_points_for_existing_profiles.sql"),
  "utf8",
);
const recyclingRouteSubmissionMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718210000_recycling_route_submission_crud.sql"),
  "utf8",
);
const recyclingRouteRpcRepairMigration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260718213000_repair_recycling_route_rpcs.sql"),
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

  it("restores every profile column required by ensure_current_profile", () => {
    expect(profileRpcRepairMigration).toContain("add column if not exists preferred_language");
    expect(profileRpcRepairMigration).toContain("add column if not exists updated_at");
    expect(profileRpcRepairMigration).toContain("add column if not exists deleted_at");
  });

  it("awards a one-time welcome bonus when a profile is first created", () => {
    expect(welcomePointsMigration).toContain("point_ledger_entries_profile_welcome_bonus_key");
    expect(welcomePointsMigration).toContain("where entry_type = 'earned' and description = 'Welcome bonus'");
    expect(welcomePointsMigration).toContain("pg_advisory_xact_lock(hashtext(current_user_id))");
    expect(welcomePointsMigration).toContain("created_new_profile := true");
    expect(welcomePointsMigration).toContain("insert into public.point_ledger_entries");
    expect(welcomePointsMigration).toContain("50");
    expect(welcomePointsMigration).toContain("where ledger.profile_id = ensured_profile_id");
    expect(welcomePointsMigration).toContain("and ledger.description = 'Welcome bonus'");
    expect(welcomePointsMigration).toContain("revoke all on function public.ensure_current_profile(text, text) from public, anon");
  });

  it("backfills welcome points for existing linked profiles", () => {
    expect(migration).toContain("profile_id uuid not null references public.profiles(id) on delete restrict");
    expect(welcomePointsBackfillMigration).toContain("point_ledger_entries_profile_id_fkey");
    expect(welcomePointsBackfillMigration).toContain("foreign key (profile_id)");
    expect(welcomePointsBackfillMigration).toContain("references public.profiles(id)");
    expect(welcomePointsBackfillMigration).toContain("insert into public.point_ledger_entries");
    expect(welcomePointsBackfillMigration).toContain("from public.profiles profile");
    expect(welcomePointsBackfillMigration).toContain("where profile.deleted_at is null");
    expect(welcomePointsBackfillMigration).toContain("50");
    expect(welcomePointsBackfillMigration).toContain("where ledger.profile_id = profile.id");
    expect(welcomePointsBackfillMigration).toContain("and ledger.description = 'Welcome bonus'");
  });

  it("protects report review and awards points only through admin approval", () => {
    expect(reportWorkflowMigration).toContain("create type public.report_status as enum ('PENDING', 'APPROVED', 'REJECTED')");
    expect(reportWorkflowMigration).toContain("alter table public.environment_reports enable row level security");
    expect(reportWorkflowMigration).toContain("profile.app_role = 'admin'");
    expect(reportWorkflowMigration).toContain("if not public.current_profile_is_admin() then");
    expect(reportApprovalPointAwardMigration).toContain("if not public.current_profile_is_admin() then");
    expect(reportApprovalPointAwardMigration).toContain("and status = 'PENDING'::public.report_status");
    expect(reportApprovalPointAwardMigration).toContain("for update");
    expect(reportApprovalPointAwardMigration).toContain("'Approved community report'");
    expect(reportApprovalPointAwardMigration).toContain("where ledger.report_id = report_row.id");
    expect(reportApprovalPointAwardMigration).toContain("drop function if exists public.claim_environment_report_points(uuid)");
  });

  it("backfills approved reports that missed report point ledger entries", () => {
    expect(approvedReportPointBackfillMigration).toContain("with repaired_reports as");
    expect(approvedReportPointBackfillMigration).toContain("report.status = 'APPROVED'::public.report_status");
    expect(approvedReportPointBackfillMigration).toContain("where ledger.report_id = report.id");
    expect(approvedReportPointBackfillMigration).toContain("ledger.points > 0");
    expect(approvedReportPointBackfillMigration).toContain("insert into public.point_ledger_entries");
    expect(approvedReportPointBackfillMigration).toContain("on conflict (report_id) where report_id is not null do nothing");
  });

  it("lets admin approval repair an already-approved report missing points", () => {
    const normalizedBackfillMigration = approvedReportPointBackfillMigration.replace(/\r\n/g, "\n");
    expect(normalizedBackfillMigration).toContain("where id = target_report_id\n  for update");
    expect(approvedReportPointBackfillMigration).toContain("if report_row.status = 'REJECTED'::public.report_status then");
    expect(approvedReportPointBackfillMigration).toContain("if report_row.status = 'PENDING'::public.report_status then");
    expect(approvedReportPointBackfillMigration).toContain("needs_award");
    expect(approvedReportPointBackfillMigration).toContain("and needs_award");
  });

  it("keeps report table reads private while allowing authenticated RLS checks", () => {
    expect(reportWorkflowMigration).toContain("grant select, insert, update on public.environment_reports to authenticated");
    expect(reportWorkflowMigration).toContain("create policy \"Members can read their reports\"");
    expect(reportWorkflowMigration).toContain("create policy \"Admins can read reports\"");
    expect(authenticatedReportSelectRepairMigration).toContain("grant select on table public.environment_reports to authenticated");
    expect(authenticatedReportSelectRepairMigration).toContain("revoke select on table public.environment_reports from anon");
  });

  it("qualifies report RPC columns that collide with returned column names", () => {
    expect(reportRpcAmbiguityRepairMigration).toContain("returning public.environment_reports.id, public.environment_reports.created_at");
    expect(reportRpcAmbiguityRepairMigration).toContain("from public.point_ledger_entries ledger");
    expect(reportRpcAmbiguityRepairMigration).toContain("ledger.report_id = report_row.id");
    expect(reportRpcAmbiguityRepairMigration).toContain("coalesce(public.environment_reports.claimed_at, now())");
    expect(reportRpcAmbiguityRepairMigration).toContain("coalesce(public.environment_reports.points_awarded, award_points)");
  });

  it("does not expose report workflow RPCs to anonymous callers", () => {
    expect(reportWorkflowMigration).toContain("revoke all on function public.submit_environment_report(text, text, text, text, text) from public, anon");
    expect(reportPhotoLocationMigration).toContain("revoke all on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text) from public, anon");
    expect(reportWorkflowMigration).toContain("revoke all on function public.approve_environment_report(uuid) from public, anon");
    expect(reportWorkflowMigration).toContain("revoke all on function public.reject_environment_report(uuid, text) from public, anon");
    expect(reportApprovalPointAwardMigration).toContain("revoke all on function public.claim_environment_report_points(uuid) from public, anon, authenticated");
  });

  it("requires report photo and current coordinates when submitting reports", () => {
    expect(reportPhotoLocationMigration).toContain("insert into storage.buckets");
    expect(reportPhotoLocationMigration).toContain("'report-photos'");
    expect(reportPhotoLocationMigration).toContain("create policy \"Members can upload own report photos\"");
    expect(reportPhotoLocationMigration).toContain("create policy \"Members and admins can read report photos\"");
    expect(reportPhotoLocationMigration).toContain("report_latitude double precision");
    expect(reportPhotoLocationMigration).toContain("report_longitude double precision");
    expect(reportPhotoLocationMigration).toContain("report_photo_storage_path text");
    expect(reportPhotoLocationMigration).toContain("raise exception 'Report image is required'");
    expect(reportPhotoLocationMigration).toContain("photo_storage_path");
  });

  it("creates recycling route tables with RLS and a shared one-time submission lock", () => {
    const compactMigration = recyclingRouteSubmissionMigration.replace(/\s+/g, " ");
    for (const table of ["recycling_pickup_requests", "recycling_center_dropoff_requests", "recycling_route_submission_locks"]) {
      expect(recyclingRouteSubmissionMigration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(recyclingRouteSubmissionMigration).toContain("constraint recycling_route_submission_locks_profile_id_key unique (profile_id)");
    expect(recyclingRouteSubmissionMigration).toContain("profile_id uuid not null references public.profiles(id) on delete restrict");
    expect(compactMigration).toContain("if exists ( select 1 from public.recycling_route_submission_locks lock where lock.profile_id = member_profile_id ) then");
    expect(recyclingRouteSubmissionMigration).toContain("insert into public.recycling_route_submission_locks");
  });

  it("protects recycling route RPCs from anonymous access", () => {
    expect(recyclingRouteSubmissionMigration).toContain("revoke all on function public.submit_recycling_pickup_request(text, text, text, jsonb, numeric, numeric, text) from public, anon");
    expect(recyclingRouteSubmissionMigration).toContain("revoke all on function public.submit_recycling_center_dropoff_request(text, text, text, text, text, jsonb, numeric, numeric, text) from public, anon");
    expect(recyclingRouteSubmissionMigration).toContain("revoke all on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, text, text, text) from public, anon");
    expect(recyclingRouteSubmissionMigration).toContain("revoke all on function public.admin_update_recycling_center_dropoff_request(uuid, public.recycling_route_request_status, text, text, text, text, text) from public, anon");
    expect(recyclingRouteSubmissionMigration).toContain("revoke all on function public.admin_delete_recycling_pickup_request(uuid) from public, anon");
    expect(recyclingRouteSubmissionMigration).toContain("revoke all on function public.admin_delete_recycling_center_dropoff_request(uuid) from public, anon");
  });

  it("repairs recycling RPCs with an atomic cross-route lock and refreshes PostgREST", () => {
    expect(recyclingRouteRpcRepairMigration).toContain("insert into public.recycling_route_submission_locks");
    expect(recyclingRouteRpcRepairMigration).toContain("when unique_violation then");
    expect(recyclingRouteRpcRepairMigration).toContain("recycling_route_submission_locks_profile_id_key");
    expect(recyclingRouteRpcRepairMigration).toContain("set deleted_at = coalesce(request.deleted_at, now())");
    expect(recyclingRouteRpcRepairMigration).toContain("revoke insert, update, delete on public.recycling_pickup_requests from anon, authenticated");
    expect(recyclingRouteRpcRepairMigration).toContain("notify pgrst, 'reload schema'");
  });
});
