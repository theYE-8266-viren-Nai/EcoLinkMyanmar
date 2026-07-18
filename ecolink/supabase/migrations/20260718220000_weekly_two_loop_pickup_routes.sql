-- Structured Saturday pickup schedules and private two-loop route plans.

do $$
begin
  create type public.pickup_schedule_status as enum ('OPEN', 'DISPATCHED', 'COMPLETED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.pickup_route_plan_status as enum ('DRAFT', 'ERROR', 'DISPATCHED');
exception when duplicate_object then null;
end $$;

create table if not exists public.pickup_schedules (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  route_area text not null default 'Yangon partner route',
  status public.pickup_schedule_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dispatched_at timestamptz,
  constraint pickup_schedules_window_check check (ends_at > starts_at),
  constraint pickup_schedules_starts_at_key unique (starts_at)
);

alter table public.recycling_pickup_requests
  add column if not exists schedule_id uuid references public.pickup_schedules(id) on delete restrict,
  add column if not exists latitude numeric(9, 6) check (latitude between -90 and 90),
  add column if not exists longitude numeric(9, 6) check (longitude between -180 and 180);

create index if not exists recycling_pickup_requests_schedule_status_idx
  on public.recycling_pickup_requests (schedule_id, status)
  where deleted_at is null;

create table if not exists public.pickup_route_plans (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.pickup_schedules(id) on delete cascade,
  route_code text not null check (route_code in ('A', 'B')),
  center_id uuid not null references public.recycling_centers(id) on delete restrict,
  center_name text not null,
  center_latitude numeric(9, 6) not null check (center_latitude between -90 and 90),
  center_longitude numeric(9, 6) not null check (center_longitude between -180 and 180),
  status public.pickup_route_plan_status not null default 'DRAFT',
  geometry jsonb not null default '[]'::jsonb check (jsonb_typeof(geometry) = 'array'),
  distance_meters numeric(12, 2) not null default 0 check (distance_meters >= 0),
  duration_seconds numeric(12, 2) not null default 0 check (duration_seconds >= 0),
  plan_version integer not null default 1 check (plan_version > 0),
  generation_error text,
  generated_at timestamptz,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_route_plans_schedule_route_key unique (schedule_id, route_code)
);

create table if not exists public.pickup_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_plan_id uuid not null references public.pickup_route_plans(id) on delete cascade,
  schedule_id uuid not null references public.pickup_schedules(id) on delete cascade,
  pickup_request_id uuid not null references public.recycling_pickup_requests(id) on delete restrict,
  route_code text not null check (route_code in ('A', 'B')),
  stop_order integer not null check (stop_order > 0),
  estimated_arrival_at timestamptz,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  constraint pickup_route_stops_request_key unique (pickup_request_id),
  constraint pickup_route_stops_plan_order_key unique (route_plan_id, stop_order)
);

create index if not exists pickup_route_plans_schedule_idx on public.pickup_route_plans (schedule_id);
create index if not exists pickup_route_stops_schedule_idx on public.pickup_route_stops (schedule_id);
create index if not exists pickup_route_stops_request_idx on public.pickup_route_stops (pickup_request_id);

alter table public.pickup_schedules enable row level security;
alter table public.pickup_route_plans enable row level security;
alter table public.pickup_route_stops enable row level security;

grant select, update on public.pickup_schedules to authenticated;
grant select, insert, update, delete on public.pickup_route_plans, public.pickup_route_stops to authenticated;
revoke all on public.pickup_schedules, public.pickup_route_plans, public.pickup_route_stops from anon;

drop policy if exists "Authenticated users can read pickup schedules" on public.pickup_schedules;
create policy "Authenticated users can read pickup schedules"
on public.pickup_schedules for select to authenticated using (true);

drop policy if exists "Admins can update pickup schedules" on public.pickup_schedules;
create policy "Admins can update pickup schedules"
on public.pickup_schedules for update to authenticated
using ((select public.current_profile_is_admin()))
with check ((select public.current_profile_is_admin()));

drop policy if exists "Admins can read pickup route plans" on public.pickup_route_plans;
create policy "Admins can read pickup route plans"
on public.pickup_route_plans for select to authenticated using ((select public.current_profile_is_admin()));

drop policy if exists "Admins can insert pickup route plans" on public.pickup_route_plans;
create policy "Admins can insert pickup route plans"
on public.pickup_route_plans for insert to authenticated with check ((select public.current_profile_is_admin()));

drop policy if exists "Admins can update pickup route plans" on public.pickup_route_plans;
create policy "Admins can update pickup route plans"
on public.pickup_route_plans for update to authenticated
using ((select public.current_profile_is_admin()))
with check ((select public.current_profile_is_admin()));

drop policy if exists "Admins can delete pickup route plans" on public.pickup_route_plans;
create policy "Admins can delete pickup route plans"
on public.pickup_route_plans for delete to authenticated using ((select public.current_profile_is_admin()));

drop policy if exists "Admins can manage pickup route stops" on public.pickup_route_stops;
create policy "Admins can manage pickup route stops"
on public.pickup_route_stops for all to authenticated
using ((select public.current_profile_is_admin()))
with check ((select public.current_profile_is_admin()));

drop policy if exists "Members can read their pickup route stop" on public.pickup_route_stops;
create policy "Members can read their pickup route stop"
on public.pickup_route_stops for select to authenticated
using (
  exists (
    select 1 from public.recycling_pickup_requests request
    where request.id = pickup_request_id
      and request.profile_id = (select public.current_profile_id())
  )
);

create or replace function public.get_or_create_next_pickup_schedule(reference_time timestamptz default now())
returns setof public.pickup_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid := public.current_profile_id();
  local_reference timestamp := reference_time at time zone 'Asia/Yangon';
  schedule_date date;
  schedule_start timestamptz;
begin
  if member_profile_id is null then
    raise exception using message = 'Authentication required', errcode = '28000';
  end if;

  schedule_date := local_reference::date
    + mod(6 - extract(dow from local_reference)::integer + 7, 7);
  if extract(dow from local_reference)::integer = 6 and local_reference::time >= time '11:00' then
    schedule_date := schedule_date + 7;
  end if;
  schedule_start := (schedule_date + time '08:00') at time zone 'Asia/Yangon';

  insert into public.pickup_schedules (starts_at, ends_at)
  values (schedule_start, schedule_start + interval '3 hours')
  on conflict (starts_at) do nothing;

  return query
  select schedule.* from public.pickup_schedules schedule
  where schedule.starts_at = schedule_start;
end;
$$;

drop function if exists public.submit_recycling_pickup_request(text, text, text, jsonb, numeric, numeric, text);

create function public.submit_recycling_pickup_request(
  pickup_address text,
  target_schedule_id uuid,
  pickup_latitude double precision,
  pickup_longitude double precision,
  selected_items jsonb,
  estimated_weight_kg numeric,
  estimated_points numeric,
  request_notes text default null
)
returns table (request_id uuid, status public.recycling_route_request_status, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid := public.current_profile_id();
  selected_schedule public.pickup_schedules%rowtype;
  new_request_id uuid := gen_random_uuid();
  submitted_at timestamptz := now();
begin
  if member_profile_id is null then
    raise exception using message = 'Authentication required', errcode = '28000';
  end if;
  if nullif(trim(pickup_address), '') is null then
    raise exception using message = 'Pickup address is required', errcode = '22023';
  end if;
  if pickup_latitude is null or pickup_latitude not between -90 and 90
     or pickup_longitude is null or pickup_longitude not between -180 and 180 then
    raise exception using message = 'Confirm a valid pickup map pin', errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(selected_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(selected_items, '[]'::jsonb)) = 0 then
    raise exception using message = 'Select at least one recyclable item', errcode = '22023';
  end if;

  select * into selected_schedule from public.pickup_schedules schedule
  where schedule.id = target_schedule_id and schedule.status = 'OPEN';
  if not found or selected_schedule.ends_at <= submitted_at then
    raise exception using message = 'The pickup schedule is no longer available', errcode = '22023';
  end if;

  begin
    insert into public.recycling_route_submission_locks (profile_id, route_type, request_id, created_at)
    values (member_profile_id, 'pickup', new_request_id, submitted_at);
  exception when unique_violation then
    raise exception using message = 'You already submitted a recycling route request.',
      errcode = '23505', constraint = 'recycling_route_submission_locks_profile_id_key';
  end;

  insert into public.recycling_pickup_requests (
    id, profile_id, selected_items, estimated_weight_kg, estimated_points, notes,
    pickup_address, route_window, route_area, schedule_id, latitude, longitude, created_at, updated_at
  ) values (
    new_request_id, member_profile_id, selected_items,
    greatest(coalesce(estimated_weight_kg, 0), 0), greatest(coalesce(estimated_points, 0), 0),
    nullif(trim(request_notes), ''), trim(pickup_address),
    to_char(selected_schedule.starts_at at time zone 'Asia/Yangon', 'Dy, Mon DD · HH12:MI AM')
      || '–' || to_char(selected_schedule.ends_at at time zone 'Asia/Yangon', 'HH12:MI AM'),
    selected_schedule.route_area, selected_schedule.id, pickup_latitude, pickup_longitude,
    submitted_at, submitted_at
  );

  return query select new_request_id, 'PENDING'::public.recycling_route_request_status, submitted_at;
end;
$$;

drop function if exists public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, text, text, text);

create function public.admin_update_recycling_pickup_request(
  target_request_id uuid,
  next_status public.recycling_route_request_status,
  next_pickup_address text,
  next_schedule_id uuid,
  next_latitude double precision,
  next_longitude double precision,
  next_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare selected_schedule public.pickup_schedules%rowtype;
begin
  if not public.current_profile_is_admin() then
    raise exception using message = 'Admin access required', errcode = '42501';
  end if;
  if nullif(trim(next_pickup_address), '') is null
     or next_latitude is null or next_latitude not between -90 and 90
     or next_longitude is null or next_longitude not between -180 and 180 then
    raise exception using message = 'Pickup address and map pin are required', errcode = '22023';
  end if;
  select * into selected_schedule from public.pickup_schedules where id = next_schedule_id;
  if not found then raise exception using message = 'Pickup schedule not found', errcode = '22023'; end if;

  update public.recycling_pickup_requests request set
    status = next_status,
    pickup_address = trim(next_pickup_address),
    schedule_id = selected_schedule.id,
    route_window = to_char(selected_schedule.starts_at at time zone 'Asia/Yangon', 'Dy, Mon DD · HH12:MI AM')
      || '–' || to_char(selected_schedule.ends_at at time zone 'Asia/Yangon', 'HH12:MI AM'),
    route_area = selected_schedule.route_area,
    latitude = next_latitude,
    longitude = next_longitude,
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where request.id = target_request_id and request.deleted_at is null;

  if not found then raise exception using message = 'Pickup request not found', errcode = 'P0002'; end if;
  return target_request_id;
end;
$$;

revoke all on function public.get_or_create_next_pickup_schedule(timestamptz) from public, anon;
revoke all on function public.submit_recycling_pickup_request(text, uuid, double precision, double precision, jsonb, numeric, numeric, text) from public, anon;
revoke all on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, uuid, double precision, double precision, text) from public, anon;
grant execute on function public.get_or_create_next_pickup_schedule(timestamptz) to authenticated;
grant execute on function public.submit_recycling_pickup_request(text, uuid, double precision, double precision, jsonb, numeric, numeric, text) to authenticated;
grant execute on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, uuid, double precision, double precision, text) to authenticated;

notify pgrst, 'reload schema';
