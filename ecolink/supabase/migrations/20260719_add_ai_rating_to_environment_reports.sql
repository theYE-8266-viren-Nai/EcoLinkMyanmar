-- Add AI environment measurement columns to environment_reports.
-- These are populated at report-submission time by calling OpenRouter.
-- All columns are nullable so existing reports remain valid and AI failures
-- do not block submission.

alter table public.environment_reports
  add column if not exists ai_confidence numeric(4, 3),
  add column if not exists ai_reasoning  text,
  add column if not exists ai_warnings   text[];

-- Soft-validate confidence range when provided.
alter table public.environment_reports
  drop constraint if exists environment_reports_ai_confidence_check;

alter table public.environment_reports
  add constraint environment_reports_ai_confidence_check
  check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1));

-- Replace the existing submit_environment_report RPC to accept the four AI
-- rating fields as optional parameters.  Existing callers that omit them will
-- continue to work because all new parameters have defaults.
drop function if exists public.submit_environment_report(text, text, text, text, double precision, double precision, text, text);
drop function if exists public.submit_environment_report(text, text, text, text, double precision, double precision, text, text, integer, numeric, text, text[]);

create or replace function public.submit_environment_report(
  report_title               text,
  report_issue_type          text,
  report_severity            text,
  report_location_text       text,
  report_latitude            double precision,
  report_longitude           double precision,
  report_photo_storage_path  text,
  report_details             text    default null,
  report_dirtiness_score     integer default null,
  report_ai_confidence       numeric default null,
  report_ai_reasoning        text    default null,
  report_ai_warnings         text[]  default null
)
returns table (
  report_id  uuid,
  status     public.report_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  new_report_id     uuid;
  new_created_at    timestamptz;
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
  if report_dirtiness_score is not null and (report_dirtiness_score < 1 or report_dirtiness_score > 10) then
    raise exception 'Dirtiness score must be between 1 and 10';
  end if;
  if report_ai_confidence is not null and (report_ai_confidence < 0 or report_ai_confidence > 1) then
    raise exception 'AI confidence must be between 0 and 1';
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
    dirtiness_score,
    ai_confidence,
    ai_reasoning,
    ai_warnings,
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
    report_dirtiness_score,
    report_ai_confidence,
    nullif(trim(coalesce(report_ai_reasoning, '')), ''),
    report_ai_warnings,
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

revoke all on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text, integer, numeric, text, text[]) from public, anon;
grant execute on function public.submit_environment_report(text, text, text, text, double precision, double precision, text, text, integer, numeric, text, text[]) to authenticated;
