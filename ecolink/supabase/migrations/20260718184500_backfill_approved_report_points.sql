-- Backfill approved reports that were reviewed before point awards moved into
-- the admin approval RPC, and keep the RPC able to repair already-approved
-- reports that are missing a positive ledger entry.

create or replace function public.approve_environment_report(target_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_profile_id uuid;
  report_row public.environment_reports%rowtype;
  award_points constant integer := 50;
  needs_award boolean;
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  select public.current_profile_id() into admin_profile_id;
  if admin_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select * into report_row
  from public.environment_reports
  where id = target_report_id
  for update;

  if report_row.id is null then
    raise exception 'Report not found';
  end if;

  if report_row.status = 'REJECTED'::public.report_status then
    raise exception 'Rejected reports cannot be approved for points';
  end if;

  if report_row.status = 'PENDING'::public.report_status then
    update public.environment_reports
    set
      status = 'APPROVED'::public.report_status,
      approved_at = now(),
      approved_by_profile_id = admin_profile_id,
      reviewed_at = now(),
      reviewed_by_profile_id = admin_profile_id,
      rejection_reason = null,
      is_claimed = true,
      claimed_at = now(),
      points_awarded = award_points
    where id = report_row.id
    returning * into report_row;
  end if;

  select report_row.reporter_profile_id is not null
    and not exists (
      select 1
      from public.point_ledger_entries ledger
      where ledger.report_id = report_row.id
        and ledger.points > 0
    )
  into needs_award;

  update public.environment_reports
  set
    is_claimed = true,
    claimed_at = coalesce(public.environment_reports.claimed_at, public.environment_reports.approved_at, public.environment_reports.reviewed_at, now()),
    points_awarded = case
      when public.environment_reports.points_awarded is null or public.environment_reports.points_awarded <= 0 then award_points
      else public.environment_reports.points_awarded
    end
  where id = report_row.id
    and status = 'APPROVED'::public.report_status
    and needs_award
  returning * into report_row;

  insert into public.point_ledger_entries (
    profile_id,
    report_id,
    points,
    entry_type,
    description,
    created_at
  )
  select
    report_row.reporter_profile_id,
    report_row.id,
    coalesce(report_row.points_awarded, award_points),
    'earned',
    'Approved community report',
    coalesce(report_row.claimed_at, report_row.approved_at, now())
  where report_row.reporter_profile_id is not null
    and needs_award
  on conflict (report_id) where report_id is not null do nothing;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  select
    report_row.reporter_profile_id,
    'points',
    'Report approved',
    coalesce(report_row.points_awarded, award_points) || ' points were added after admin approval.',
    '/dashboard'
  where report_row.reporter_profile_id is not null
    and report_row.status = 'APPROVED'::public.report_status
    and needs_award;

  return target_report_id;
end;
$$;

revoke all on function public.approve_environment_report(uuid) from public, anon;
grant execute on function public.approve_environment_report(uuid) to authenticated;

with repaired_reports as (
  update public.environment_reports report
  set
    is_claimed = true,
    claimed_at = coalesce(report.claimed_at, report.approved_at, report.reviewed_at, now()),
    points_awarded = case
      when report.points_awarded is null or report.points_awarded <= 0 then 50
      else report.points_awarded
    end
  where report.status = 'APPROVED'::public.report_status
    and report.reporter_profile_id is not null
    and not exists (
      select 1
      from public.point_ledger_entries ledger
      where ledger.report_id = report.id
        and ledger.points > 0
    )
  returning report.id, report.reporter_profile_id, report.points_awarded, report.claimed_at, report.approved_at
)
insert into public.point_ledger_entries (
  profile_id,
  report_id,
  points,
  entry_type,
  description,
  created_at
)
select
  reporter_profile_id,
  id,
  coalesce(points_awarded, 50),
  'earned',
  'Approved community report',
  coalesce(claimed_at, approved_at, now())
from repaired_reports
on conflict (report_id) where report_id is not null do nothing;
