-- Award report points at the admin approval boundary.
-- Members do not claim points; approved report points are written to the ledger
-- by the admin-only approval RPC.

create index if not exists point_ledger_entries_report_created_at_idx
  on public.point_ledger_entries (report_id, created_at desc)
  where report_id is not null;

create index if not exists point_ledger_entries_profile_report_created_at_idx
  on public.point_ledger_entries (profile_id, report_id, created_at desc);

delete from public.point_ledger_entries
where drop_off_id is not null
  and points > 0;

alter table public.verified_drop_offs
  drop constraint if exists verified_drop_offs_points_awarded_check;

alter table public.verified_drop_offs
  add constraint verified_drop_offs_points_awarded_check
  check (points_awarded >= 0);

update public.verified_drop_offs
set points_awarded = 0
where points_awarded <> 0;

create or replace function public.record_center_drop_off(
  member_code text,
  material_slug text,
  weight_kg numeric
)
returns table (drop_off_id uuid, points_awarded integer, center_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_profile_id uuid;
  assigned_center_id uuid;
  member_profile_id uuid;
  new_drop_off_id uuid;
begin
  if public.request_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select profile.id into staff_profile_id
  from public.profiles profile
  where profile.auth_user_id = public.request_user_id();

  select assignment.center_id into assigned_center_id
  from public.center_staff_assignments assignment
  where assignment.profile_id = staff_profile_id
    and assignment.is_active
  order by assignment.created_at
  limit 1;

  if assigned_center_id is null then
    raise exception 'No active center assignment';
  end if;

  select profile.id into member_profile_id
  from public.profiles profile
  where upper(profile.member_code) = upper(record_center_drop_off.member_code);

  if member_profile_id is null then
    raise exception 'Member code not found';
  end if;

  if weight_kg <= 0 or weight_kg > 500 then
    raise exception 'Weight must be between 0 and 500 kilograms';
  end if;

  insert into public.verified_drop_offs (
    center_id, member_profile_id, recorded_by_profile_id,
    material_slug, weight_kg, points_awarded
  ) values (
    assigned_center_id, member_profile_id, staff_profile_id,
    material_slug, weight_kg, 0
  ) returning id into new_drop_off_id;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (
    member_profile_id,
    'center',
    'Drop-off recorded',
    'Your recycling drop-off was recorded. Points are awarded only for admin-approved reports.',
    '/dashboard'
  );

  return query select new_drop_off_id, 0, assigned_center_id;
end;
$$;

revoke all on function public.record_center_drop_off(text, text, numeric) from public, anon;
grant execute on function public.record_center_drop_off(text, text, numeric) to authenticated;

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
    and status = 'PENDING'::public.report_status
  for update;

  if report_row.id is null then
    raise exception 'Pending report not found';
  end if;

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
    award_points,
    'earned',
    'Approved community report',
    report_row.approved_at
  where report_row.reporter_profile_id is not null
    and not exists (
      select 1
      from public.point_ledger_entries ledger
      where ledger.report_id = report_row.id
        and ledger.points > 0
    );

  insert into public.user_notifications (profile_id, kind, title, message, href)
  select
    report_row.reporter_profile_id,
    'points',
    'Report approved',
    award_points || ' points were added after admin approval.',
    '/dashboard'
  where report_row.reporter_profile_id is not null;

  return target_report_id;
end;
$$;

revoke all on function public.approve_environment_report(uuid) from public, anon;
grant execute on function public.approve_environment_report(uuid) to authenticated;

revoke all on function public.claim_environment_report_points(uuid) from public, anon, authenticated;
drop function if exists public.claim_environment_report_points(uuid);
