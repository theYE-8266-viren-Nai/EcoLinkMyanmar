create extension if not exists postgis schema extensions;

alter table public.environment_reports
  add column if not exists location extensions.geometry(Point, 4326)
  generated always as (
    extensions.st_setsrid(
      extensions.st_makepoint(longitude::double precision, latitude::double precision),
      4326
    )
  ) stored;

alter table public.recycling_centers
  add column if not exists location extensions.geometry(Point, 4326)
  generated always as (
    extensions.st_setsrid(
      extensions.st_makepoint(longitude::double precision, latitude::double precision),
      4326
    )
  ) stored;

create index if not exists environment_reports_location_gist_idx
  on public.environment_reports using gist (location);

create index if not exists recycling_centers_location_gist_idx
  on public.recycling_centers using gist (location);

create table if not exists public.collector_vehicles (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.recycling_centers(id) on delete cascade,
  public_label text not null check (char_length(public_label) between 1 and 80),
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collector_vehicle_locations (
  vehicle_id uuid primary key references public.collector_vehicles(id) on delete cascade,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  heading numeric(6, 2) not null default 0 check (heading >= 0 and heading < 360),
  speed_kph numeric(6, 2) not null default 0 check (speed_kph >= 0 and speed_kph <= 180),
  status text not null default 'collecting'
    check (status in ('collecting', 'en_route', 'returning', 'offline')),
  observed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists collector_vehicles_center_active_idx
  on public.collector_vehicles (center_id, is_active)
  where is_active;

create index if not exists collector_vehicle_locations_observed_at_idx
  on public.collector_vehicle_locations (observed_at desc);

alter table public.collector_vehicles enable row level security;
alter table public.collector_vehicle_locations enable row level security;

grant select on public.collector_vehicles, public.collector_vehicle_locations
  to anon, authenticated;
grant insert, update on public.collector_vehicle_locations to authenticated;

create policy "Public vehicles are visible"
on public.collector_vehicles for select
to anon, authenticated
using (is_active and is_public);

create policy "Assigned staff can read vehicles"
on public.collector_vehicles for select
to authenticated
using (
  exists (
    select 1
    from public.center_staff_assignments assignment
    join public.profiles profile on profile.id = assignment.profile_id
    where assignment.center_id = center_id
      and assignment.is_active
      and profile.auth_user_id = (select public.request_user_id())
  )
);

create policy "Public vehicle locations are visible"
on public.collector_vehicle_locations for select
to anon, authenticated
using (
  exists (
    select 1
    from public.collector_vehicles vehicle
    where vehicle.id = vehicle_id
      and vehicle.is_active
      and vehicle.is_public
  )
);

create policy "Assigned staff can read vehicle locations"
on public.collector_vehicle_locations for select
to authenticated
using (
  exists (
    select 1
    from public.collector_vehicles vehicle
    join public.center_staff_assignments assignment
      on assignment.center_id = vehicle.center_id and assignment.is_active
    join public.profiles profile on profile.id = assignment.profile_id
    where vehicle.id = vehicle_id
      and profile.auth_user_id = (select public.request_user_id())
  )
);

create policy "Assigned staff can insert vehicle locations"
on public.collector_vehicle_locations for insert
to authenticated
with check (
  exists (
    select 1
    from public.collector_vehicles vehicle
    join public.center_staff_assignments assignment
      on assignment.center_id = vehicle.center_id and assignment.is_active
    join public.profiles profile on profile.id = assignment.profile_id
    where vehicle.id = vehicle_id
      and vehicle.is_active
      and profile.auth_user_id = (select public.request_user_id())
  )
);

create policy "Assigned staff can update vehicle locations"
on public.collector_vehicle_locations for update
to authenticated
using (
  exists (
    select 1
    from public.collector_vehicles vehicle
    join public.center_staff_assignments assignment
      on assignment.center_id = vehicle.center_id and assignment.is_active
    join public.profiles profile on profile.id = assignment.profile_id
    where vehicle.id = vehicle_id
      and vehicle.is_active
      and profile.auth_user_id = (select public.request_user_id())
  )
)
with check (
  exists (
    select 1
    from public.collector_vehicles vehicle
    join public.center_staff_assignments assignment
      on assignment.center_id = vehicle.center_id and assignment.is_active
    join public.profiles profile on profile.id = assignment.profile_id
    where vehicle.id = vehicle_id
      and vehicle.is_active
      and profile.auth_user_id = (select public.request_user_id())
  )
);

revoke select on public.environment_reports from anon, authenticated;

create or replace function public.get_public_waste_map(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  requested_zoom double precision,
  observed_since timestamptz,
  requested_waste_type text default null
)
returns table (
  mode text,
  feature_id text,
  geometry jsonb,
  properties jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewport extensions.geometry;
begin
  if min_lng >= max_lng or min_lat >= max_lat
    or min_lng < -180 or max_lng > 180
    or min_lat < -90 or max_lat > 90
    or requested_zoom < 0 or requested_zoom > 22 then
    raise exception 'Invalid map viewport';
  end if;

  viewport := extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);

  if requested_zoom < 12 then
    return query
    select
      'heatmap'::text,
      concat(round(report.longitude, 2), ':', round(report.latitude, 2)),
      jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(
          avg(report.longitude)::double precision,
          avg(report.latitude)::double precision
        )
      ),
      jsonb_build_object(
        'count', count(*)::integer,
        'averageScore', round(avg(report.dirtiness_score), 2)
      )
    from public.environment_reports report
    where report.observed_at >= observed_since
      and report.location && viewport
      and report.status <> 'resolved'
      and (requested_waste_type is null or report.waste_type::text = requested_waste_type)
    group by round(report.longitude, 2), round(report.latitude, 2);
  else
    return query
    select
      'reports'::text,
      report.id::text,
      jsonb_build_object(
        'type', 'Point',
        'coordinates', jsonb_build_array(
          round(report.longitude, 3)::double precision,
          round(report.latitude, 3)::double precision
        )
      ),
      jsonb_build_object(
        'score', report.dirtiness_score,
        'wasteType', report.waste_type::text,
        'status', report.status,
        'observedAt', report.observed_at
      )
    from public.environment_reports report
    where report.observed_at >= observed_since
      and report.location && viewport
      and report.status <> 'resolved'
      and (requested_waste_type is null or report.waste_type::text = requested_waste_type);
  end if;
end;
$$;

revoke all on function public.get_public_waste_map(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  text
) from public;
grant execute on function public.get_public_waste_map(
  double precision,
  double precision,
  double precision,
  double precision,
  double precision,
  timestamptz,
  text
) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'collector_vehicle_locations'
  ) then
    alter publication supabase_realtime add table public.collector_vehicle_locations;
  end if;
end
$$;
