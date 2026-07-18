create extension if not exists pgcrypto;

do $$
begin
  create type public.recycling_route_request_status as enum (
    'PENDING',
    'ACCEPTED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.recycling_route_submission_locks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  route_type text not null check (route_type in ('pickup', 'center_dropoff')),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint recycling_route_submission_locks_profile_id_key unique (profile_id)
);

create table if not exists public.recycling_pickup_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  selected_items jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_items) = 'array'),
  estimated_weight_kg numeric(10, 2) not null default 0 check (estimated_weight_kg >= 0),
  estimated_points numeric(10, 2) not null default 0 check (estimated_points >= 0),
  notes text,
  status public.recycling_route_request_status not null default 'PENDING',
  pickup_address text not null,
  route_window text not null,
  route_area text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recycling_center_dropoff_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  selected_items jsonb not null default '[]'::jsonb check (jsonb_typeof(selected_items) = 'array'),
  estimated_weight_kg numeric(10, 2) not null default 0 check (estimated_weight_kg >= 0),
  estimated_points numeric(10, 2) not null default 0 check (estimated_points >= 0),
  notes text,
  status public.recycling_route_request_status not null default 'PENDING',
  center_id text,
  center_name text not null,
  center_address text not null,
  center_township text not null,
  center_hours text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recycling_route_submission_locks_profile_idx
  on public.recycling_route_submission_locks (profile_id);

create index if not exists recycling_pickup_requests_profile_created_at_idx
  on public.recycling_pickup_requests (profile_id, created_at desc);

create index if not exists recycling_pickup_requests_status_created_at_idx
  on public.recycling_pickup_requests (status, created_at desc)
  where deleted_at is null;

create index if not exists recycling_center_dropoff_requests_profile_created_at_idx
  on public.recycling_center_dropoff_requests (profile_id, created_at desc);

create index if not exists recycling_center_dropoff_requests_status_created_at_idx
  on public.recycling_center_dropoff_requests (status, created_at desc)
  where deleted_at is null;

alter table public.recycling_route_submission_locks enable row level security;
alter table public.recycling_pickup_requests enable row level security;
alter table public.recycling_center_dropoff_requests enable row level security;

grant select on public.recycling_route_submission_locks,
  public.recycling_pickup_requests,
  public.recycling_center_dropoff_requests to authenticated;

grant insert, update on public.recycling_route_submission_locks,
  public.recycling_pickup_requests,
  public.recycling_center_dropoff_requests to authenticated;

drop policy if exists "Members can read own route submission lock" on public.recycling_route_submission_locks;
drop policy if exists "Admins can read route submission locks" on public.recycling_route_submission_locks;
drop policy if exists "Members can read own pickup requests" on public.recycling_pickup_requests;
drop policy if exists "Admins can read pickup requests" on public.recycling_pickup_requests;
drop policy if exists "Members can read own center dropoff requests" on public.recycling_center_dropoff_requests;
drop policy if exists "Admins can read center dropoff requests" on public.recycling_center_dropoff_requests;

create policy "Members can read own route submission lock"
on public.recycling_route_submission_locks
for select
to authenticated
using (profile_id = public.current_profile_id());

create policy "Admins can read route submission locks"
on public.recycling_route_submission_locks
for select
to authenticated
using (public.current_profile_is_admin());

create policy "Members can read own pickup requests"
on public.recycling_pickup_requests
for select
to authenticated
using (profile_id = public.current_profile_id());

create policy "Admins can read pickup requests"
on public.recycling_pickup_requests
for select
to authenticated
using (public.current_profile_is_admin());

create policy "Members can read own center dropoff requests"
on public.recycling_center_dropoff_requests
for select
to authenticated
using (profile_id = public.current_profile_id());

create policy "Admins can read center dropoff requests"
on public.recycling_center_dropoff_requests
for select
to authenticated
using (public.current_profile_is_admin());

create or replace function public.submit_recycling_pickup_request(
  pickup_address text,
  route_window text,
  route_area text,
  selected_items jsonb,
  estimated_weight_kg numeric,
  estimated_points numeric,
  request_notes text default null
)
returns table (
  request_id uuid,
  status public.recycling_route_request_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  new_request public.recycling_pickup_requests%rowtype;
begin
  select public.current_profile_id() into member_profile_id;
  if member_profile_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtext(member_profile_id::text));

  if exists (
    select 1
    from public.recycling_route_submission_locks lock
    where lock.profile_id = member_profile_id
  ) then
    raise exception 'You already submitted a recycling route request.';
  end if;

  if nullif(trim(pickup_address), '') is null then
    raise exception 'Pickup address is required';
  end if;

  if nullif(trim(route_window), '') is null or nullif(trim(route_area), '') is null then
    raise exception 'Pickup schedule is required';
  end if;

  if jsonb_typeof(coalesce(selected_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Selected items must be an array';
  end if;

  insert into public.recycling_pickup_requests (
    profile_id,
    selected_items,
    estimated_weight_kg,
    estimated_points,
    notes,
    pickup_address,
    route_window,
    route_area
  ) values (
    member_profile_id,
    coalesce(selected_items, '[]'::jsonb),
    greatest(coalesce(estimated_weight_kg, 0), 0),
    greatest(coalesce(estimated_points, 0), 0),
    nullif(trim(request_notes), ''),
    trim(pickup_address),
    trim(route_window),
    trim(route_area)
  )
  returning * into new_request;

  insert into public.recycling_route_submission_locks (profile_id, route_type, request_id)
  values (member_profile_id, 'pickup', new_request.id);

  return query select new_request.id, new_request.status, new_request.created_at;
end;
$$;

create or replace function public.submit_recycling_center_dropoff_request(
  target_center_id text,
  center_name text,
  center_address text,
  center_township text,
  center_hours text,
  selected_items jsonb,
  estimated_weight_kg numeric,
  estimated_points numeric,
  request_notes text default null
)
returns table (
  request_id uuid,
  status public.recycling_route_request_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  new_request public.recycling_center_dropoff_requests%rowtype;
begin
  select public.current_profile_id() into member_profile_id;
  if member_profile_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtext(member_profile_id::text));

  if exists (
    select 1
    from public.recycling_route_submission_locks lock
    where lock.profile_id = member_profile_id
  ) then
    raise exception 'You already submitted a recycling route request.';
  end if;

  if nullif(trim(center_name), '') is null or nullif(trim(center_address), '') is null then
    raise exception 'Recycle center is required';
  end if;

  if nullif(trim(center_township), '') is null or nullif(trim(center_hours), '') is null then
    raise exception 'Recycle center details are required';
  end if;

  if jsonb_typeof(coalesce(selected_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Selected items must be an array';
  end if;

  insert into public.recycling_center_dropoff_requests (
    profile_id,
    selected_items,
    estimated_weight_kg,
    estimated_points,
    notes,
    center_id,
    center_name,
    center_address,
    center_township,
    center_hours
  ) values (
    member_profile_id,
    coalesce(selected_items, '[]'::jsonb),
    greatest(coalesce(estimated_weight_kg, 0), 0),
    greatest(coalesce(estimated_points, 0), 0),
    nullif(trim(request_notes), ''),
    target_center_id,
    trim(center_name),
    trim(center_address),
    trim(center_township),
    trim(center_hours)
  )
  returning * into new_request;

  insert into public.recycling_route_submission_locks (profile_id, route_type, request_id)
  values (member_profile_id, 'center_dropoff', new_request.id);

  return query select new_request.id, new_request.status, new_request.created_at;
end;
$$;

create or replace function public.admin_update_recycling_pickup_request(
  target_request_id uuid,
  next_status public.recycling_route_request_status,
  next_pickup_address text,
  next_route_window text,
  next_route_area text,
  next_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.recycling_pickup_requests
  set
    status = next_status,
    pickup_address = trim(next_pickup_address),
    route_window = trim(next_route_window),
    route_area = trim(next_route_area),
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where id = target_request_id
    and deleted_at is null;

  if not found then
    raise exception 'Pickup request not found';
  end if;

  return target_request_id;
end;
$$;

create or replace function public.admin_update_recycling_center_dropoff_request(
  target_request_id uuid,
  next_status public.recycling_route_request_status,
  next_center_name text,
  next_center_address text,
  next_center_township text,
  next_center_hours text,
  next_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.recycling_center_dropoff_requests
  set
    status = next_status,
    center_name = trim(next_center_name),
    center_address = trim(next_center_address),
    center_township = trim(next_center_township),
    center_hours = trim(next_center_hours),
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where id = target_request_id
    and deleted_at is null;

  if not found then
    raise exception 'Center drop-off request not found';
  end if;

  return target_request_id;
end;
$$;

create or replace function public.admin_delete_recycling_pickup_request(target_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.recycling_pickup_requests
  set deleted_at = coalesce(deleted_at, now()), updated_at = now()
  where id = target_request_id;

  if not found then
    raise exception 'Pickup request not found';
  end if;

  return target_request_id;
end;
$$;

create or replace function public.admin_delete_recycling_center_dropoff_request(target_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.recycling_center_dropoff_requests
  set deleted_at = coalesce(deleted_at, now()), updated_at = now()
  where id = target_request_id;

  if not found then
    raise exception 'Center drop-off request not found';
  end if;

  return target_request_id;
end;
$$;

revoke all on function public.submit_recycling_pickup_request(text, text, text, jsonb, numeric, numeric, text) from public, anon;
revoke all on function public.submit_recycling_center_dropoff_request(text, text, text, text, text, jsonb, numeric, numeric, text) from public, anon;
revoke all on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, text, text, text) from public, anon;
revoke all on function public.admin_update_recycling_center_dropoff_request(uuid, public.recycling_route_request_status, text, text, text, text, text) from public, anon;
revoke all on function public.admin_delete_recycling_pickup_request(uuid) from public, anon;
revoke all on function public.admin_delete_recycling_center_dropoff_request(uuid) from public, anon;

grant execute on function public.submit_recycling_pickup_request(text, text, text, jsonb, numeric, numeric, text) to authenticated;
grant execute on function public.submit_recycling_center_dropoff_request(text, text, text, text, text, jsonb, numeric, numeric, text) to authenticated;
grant execute on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, text, text, text) to authenticated;
grant execute on function public.admin_update_recycling_center_dropoff_request(uuid, public.recycling_route_request_status, text, text, text, text, text) to authenticated;
grant execute on function public.admin_delete_recycling_pickup_request(uuid) to authenticated;
grant execute on function public.admin_delete_recycling_center_dropoff_request(uuid) to authenticated;
