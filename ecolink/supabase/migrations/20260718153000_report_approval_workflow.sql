do $$
begin
  create type public.report_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists app_role text not null default 'member';

alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check check (app_role in ('member', 'admin'));

alter table public.environment_reports
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column dirtiness_score drop not null,
  add column if not exists title text,
  add column if not exists location_text text,
  add column if not exists details text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists claimed_at timestamptz,
  add column if not exists points_awarded integer,
  add column if not exists is_claimed boolean not null default false;

alter table public.environment_reports
  alter column title set default 'Environmental report',
  alter column status drop default;

update public.environment_reports
set title = coalesce(nullif(trim(title), ''), 'Environmental report')
where title is null or nullif(trim(title), '') is null;

alter table public.environment_reports
  alter column title set not null;

alter table public.environment_reports
  alter column status type public.report_status
  using (
    case upper(status::text)
      when 'APPROVED' then 'APPROVED'::public.report_status
      when 'REJECTED' then 'REJECTED'::public.report_status
      else 'PENDING'::public.report_status
    end
  );

alter table public.environment_reports
  alter column status set default 'PENDING'::public.report_status,
  alter column status set not null;

alter table public.environment_reports
  drop constraint if exists environment_reports_claim_points_check;

alter table public.environment_reports
  add constraint environment_reports_claim_points_check
  check (
    (is_claimed = false and claimed_at is null and points_awarded is null)
    or (is_claimed = true and claimed_at is not null and points_awarded is not null and points_awarded > 0)
  );

alter table public.point_ledger_entries
  add column if not exists report_id uuid references public.environment_reports(id) on delete set null;

create unique index if not exists point_ledger_entries_report_id_key
  on public.point_ledger_entries (report_id)
  where report_id is not null;

create index if not exists environment_reports_pending_created_at_idx
  on public.environment_reports (created_at desc)
  where status = 'PENDING'::public.report_status;

create index if not exists environment_reports_reporter_created_at_idx
  on public.environment_reports (reporter_profile_id, created_at desc);

create index if not exists environment_reports_claimable_idx
  on public.environment_reports (reporter_profile_id, status, is_claimed)
  where status = 'APPROVED'::public.report_status;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.profiles profile
  where profile.auth_user_id = public.request_user_id()
  limit 1
$$;

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.auth_user_id = public.request_user_id()
      and profile.app_role = 'admin'
  )
$$;

revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.current_profile_is_admin() from public, anon;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_profile_is_admin() to authenticated;

drop policy if exists "Environment reports are public" on public.environment_reports;
drop policy if exists "Anyone can create an environment report" on public.environment_reports;
drop policy if exists "Members can read their reports" on public.environment_reports;
drop policy if exists "Admins can read reports" on public.environment_reports;
drop policy if exists "Admins can read profiles" on public.profiles;

revoke select, insert, update, delete on public.environment_reports from anon;
grant select, insert, update on public.environment_reports to authenticated;
grant select, insert, update, delete on public.environment_reports to service_role;
grant select on public.profiles to authenticated;
grant select, insert, update on public.point_ledger_entries to authenticated;

alter table public.environment_reports enable row level security;

create policy "Members can read their reports"
on public.environment_reports
for select
to authenticated
using (reporter_profile_id = public.current_profile_id());

create policy "Admins can read reports"
on public.environment_reports
for select
to authenticated
using (public.current_profile_is_admin());

create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using (public.current_profile_is_admin());

create or replace function public.submit_environment_report(
  report_title text,
  report_issue_type text,
  report_severity text,
  report_location_text text,
  report_details text default null
)
returns table (
  report_id uuid,
  status public.report_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  new_report_id uuid;
  new_created_at timestamptz;
begin
  if public.request_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select public.current_profile_id() into member_profile_id;
  if member_profile_id is null then
    raise exception 'Profile not found';
  end if;

  if nullif(trim(report_title), '') is null then
    raise exception 'Report title is required';
  end if;
  if nullif(trim(report_issue_type), '') is null then
    raise exception 'Report issue type is required';
  end if;
  if nullif(trim(report_severity), '') is null then
    raise exception 'Report severity is required';
  end if;
  if nullif(trim(report_location_text), '') is null then
    raise exception 'Report location is required';
  end if;

  insert into public.environment_reports (
    reporter_profile_id,
    title,
    issue_type,
    severity,
    location_text,
    details,
    notes,
    status,
    is_claimed,
    created_at,
    observed_at
  ) values (
    member_profile_id,
    trim(report_title),
    trim(report_issue_type),
    trim(report_severity),
    trim(report_location_text),
    nullif(trim(coalesce(report_details, '')), ''),
    nullif(trim(coalesce(report_details, '')), ''),
    'PENDING'::public.report_status,
    false,
    now(),
    now()
  )
  returning id, created_at into new_report_id, new_created_at;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (
    member_profile_id,
    'report',
    'Report awaiting review',
    'Your report is awaiting admin approval.',
    '/report'
  );

  return query select new_report_id, 'PENDING'::public.report_status, new_created_at;
end;
$$;

create or replace function public.approve_environment_report(target_report_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_profile_id uuid;
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  select public.current_profile_id() into admin_profile_id;
  if admin_profile_id is null then
    raise exception 'Profile not found';
  end if;

  update public.environment_reports
  set
    status = 'APPROVED'::public.report_status,
    approved_at = now(),
    approved_by_profile_id = admin_profile_id,
    reviewed_at = now(),
    reviewed_by_profile_id = admin_profile_id,
    rejection_reason = null
  where id = target_report_id
    and status = 'PENDING'::public.report_status;

  if not found then
    raise exception 'Pending report not found';
  end if;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  select
    report.reporter_profile_id,
    'report',
    'Report approved',
    'Your report was approved. You can now claim points.',
    '/report'
  from public.environment_reports report
  where report.id = target_report_id
    and report.reporter_profile_id is not null;

  return target_report_id;
end;
$$;

create or replace function public.reject_environment_report(
  target_report_id uuid,
  reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_profile_id uuid;
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  select public.current_profile_id() into admin_profile_id;
  if admin_profile_id is null then
    raise exception 'Profile not found';
  end if;

  update public.environment_reports
  set
    status = 'REJECTED'::public.report_status,
    reviewed_at = now(),
    reviewed_by_profile_id = admin_profile_id,
    rejection_reason = nullif(trim(coalesce(reason, '')), '')
  where id = target_report_id
    and status = 'PENDING'::public.report_status;

  if not found then
    raise exception 'Pending report not found';
  end if;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  select
    report.reporter_profile_id,
    'report',
    'Report rejected',
    'Your report was reviewed but not approved for points.',
    '/report'
  from public.environment_reports report
  where report.id = target_report_id
    and report.reporter_profile_id is not null;

  return target_report_id;
end;
$$;

create or replace function public.claim_environment_report_points(target_report_id uuid)
returns table (
  report_id uuid,
  points_awarded integer,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  report_row public.environment_reports%rowtype;
  award_points constant integer := 50;
begin
  if public.request_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select public.current_profile_id() into member_profile_id;
  if member_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select * into report_row
  from public.environment_reports
  where id = target_report_id
  for update;

  if report_row.id is null or report_row.reporter_profile_id is distinct from member_profile_id then
    raise exception 'Report not found';
  end if;

  if report_row.status <> 'APPROVED'::public.report_status then
    raise exception 'Report is awaiting admin approval';
  end if;

  if report_row.is_claimed then
    return query select report_row.id, report_row.points_awarded, report_row.claimed_at;
    return;
  end if;

  insert into public.point_ledger_entries (
    profile_id,
    report_id,
    points,
    entry_type,
    description,
    created_at
  ) values (
    member_profile_id,
    report_row.id,
    award_points,
    'earned',
    'Approved community report',
    now()
  )
  on conflict (report_id) where report_id is not null do nothing;

  update public.environment_reports
  set
    is_claimed = true,
    claimed_at = coalesce(claimed_at, now()),
    points_awarded = coalesce(points_awarded, award_points)
  where id = report_row.id
  returning * into report_row;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (
    member_profile_id,
    'points',
    'Report points claimed',
    award_points || ' points were added for your approved report.',
    '/dashboard'
  );

  return query select report_row.id, report_row.points_awarded, report_row.claimed_at;
end;
$$;

revoke all on function public.submit_environment_report(text, text, text, text, text) from public, anon;
revoke all on function public.approve_environment_report(uuid) from public, anon;
revoke all on function public.reject_environment_report(uuid, text) from public, anon;
revoke all on function public.claim_environment_report_points(uuid) from public, anon;

grant execute on function public.submit_environment_report(text, text, text, text, text) to authenticated;
grant execute on function public.approve_environment_report(uuid) to authenticated;
grant execute on function public.reject_environment_report(uuid, text) to authenticated;
grant execute on function public.claim_environment_report_points(uuid) to authenticated;
