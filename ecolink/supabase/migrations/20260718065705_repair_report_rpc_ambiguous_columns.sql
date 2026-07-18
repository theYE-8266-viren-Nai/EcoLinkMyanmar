-- Repair PL/pgSQL output-column name collisions in report workflow RPCs.
-- In RETURNS TABLE functions, output column names are variables. Qualify table
-- columns so PostgreSQL does not confuse them with those output variables.

create or replace function public.submit_environment_report(
  report_title text,
  report_issue_type text,
  report_severity text,
  report_location_text text,
  report_latitude double precision,
  report_longitude double precision,
  report_photo_storage_path text,
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
  if report_latitude is null or report_latitude < -90 or report_latitude > 90 then
    raise exception 'Report latitude is invalid';
  end if;
  if report_longitude is null or report_longitude < -180 or report_longitude > 180 then
    raise exception 'Report longitude is invalid';
  end if;
  if nullif(trim(report_photo_storage_path), '') is null then
    raise exception 'Report image is required';
  end if;

  insert into public.environment_reports (
    reporter_profile_id,
    title,
    issue_type,
    severity,
    location_text,
    latitude,
    longitude,
    photo_storage_path,
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
    report_latitude,
    report_longitude,
    trim(report_photo_storage_path),
    nullif(trim(coalesce(report_details, '')), ''),
    nullif(trim(coalesce(report_details, '')), ''),
    'PENDING'::public.report_status,
    false,
    now(),
    now()
  )
  returning public.environment_reports.id, public.environment_reports.created_at
  into new_report_id, new_created_at;

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
  )
  select
    member_profile_id,
    report_row.id,
    award_points,
    'earned',
    'Approved community report',
    now()
  where not exists (
    select 1
    from public.point_ledger_entries ledger
    where ledger.report_id = report_row.id
  );

  update public.environment_reports
  set
    is_claimed = true,
    claimed_at = coalesce(public.environment_reports.claimed_at, now()),
    points_awarded = coalesce(public.environment_reports.points_awarded, award_points)
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

revoke all on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text) from public, anon;
revoke all on function public.claim_environment_report_points(uuid) from public, anon;

grant execute on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text) to authenticated;
grant execute on function public.claim_environment_report_points(uuid) to authenticated;
