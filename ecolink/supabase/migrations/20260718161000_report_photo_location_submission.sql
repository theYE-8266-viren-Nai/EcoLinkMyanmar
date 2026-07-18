insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-photos',
  'report-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can upload own report photos" on storage.objects;
drop policy if exists "Members and admins can read report photos" on storage.objects;

create policy "Members can upload own report photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Members and admins can read report photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'report-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.current_profile_is_admin()
  )
);

drop function if exists public.submit_environment_report(text, text, text, text, text);

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

revoke all on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text) from public, anon;
grant execute on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text) to authenticated;
