-- Recreate the recycling route RPC contract after a partial SQL-editor run and
-- force PostgREST to refresh the function signatures it exposes.

drop function if exists public.submit_recycling_pickup_request(text, text, text, jsonb, numeric, numeric, text);
drop function if exists public.submit_recycling_center_dropoff_request(text, text, text, text, text, jsonb, numeric, numeric, text);
drop function if exists public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, text, text, text);
drop function if exists public.admin_update_recycling_center_dropoff_request(uuid, public.recycling_route_request_status, text, text, text, text, text);
drop function if exists public.admin_delete_recycling_pickup_request(uuid);
drop function if exists public.admin_delete_recycling_center_dropoff_request(uuid);

create function public.submit_recycling_pickup_request(
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
  member_profile_id uuid := public.current_profile_id();
  new_request_id uuid := gen_random_uuid();
  submitted_at timestamptz := now();
begin
  if member_profile_id is null then
    raise exception using message = 'Authentication required', errcode = '28000';
  end if;

  if nullif(trim(pickup_address), '') is null then
    raise exception using message = 'Pickup address is required', errcode = '22023';
  end if;
  if nullif(trim(route_window), '') is null or nullif(trim(route_area), '') is null then
    raise exception using message = 'Pickup schedule is required', errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(selected_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(selected_items, '[]'::jsonb)) = 0 then
    raise exception using message = 'Select at least one recyclable item', errcode = '22023';
  end if;

  begin
    insert into public.recycling_route_submission_locks (profile_id, route_type, request_id, created_at)
    values (member_profile_id, 'pickup', new_request_id, submitted_at);
  exception
    when unique_violation then
      raise exception using
        message = 'You already submitted a recycling route request.',
        errcode = '23505',
        constraint = 'recycling_route_submission_locks_profile_id_key';
  end;

  insert into public.recycling_pickup_requests (
    id,
    profile_id,
    selected_items,
    estimated_weight_kg,
    estimated_points,
    notes,
    pickup_address,
    route_window,
    route_area,
    created_at,
    updated_at
  ) values (
    new_request_id,
    member_profile_id,
    selected_items,
    greatest(coalesce(estimated_weight_kg, 0), 0),
    greatest(coalesce(estimated_points, 0), 0),
    nullif(trim(request_notes), ''),
    trim(pickup_address),
    trim(route_window),
    trim(route_area),
    submitted_at,
    submitted_at
  );

  return query
  select new_request_id, 'PENDING'::public.recycling_route_request_status, submitted_at;
end;
$$;

create function public.submit_recycling_center_dropoff_request(
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
  member_profile_id uuid := public.current_profile_id();
  new_request_id uuid := gen_random_uuid();
  submitted_at timestamptz := now();
begin
  if member_profile_id is null then
    raise exception using message = 'Authentication required', errcode = '28000';
  end if;

  if nullif(trim(center_name), '') is null or nullif(trim(center_address), '') is null then
    raise exception using message = 'Recycle center is required', errcode = '22023';
  end if;
  if nullif(trim(center_township), '') is null or nullif(trim(center_hours), '') is null then
    raise exception using message = 'Recycle center details are required', errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(selected_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(selected_items, '[]'::jsonb)) = 0 then
    raise exception using message = 'Select at least one recyclable item', errcode = '22023';
  end if;

  begin
    insert into public.recycling_route_submission_locks (profile_id, route_type, request_id, created_at)
    values (member_profile_id, 'center_dropoff', new_request_id, submitted_at);
  exception
    when unique_violation then
      raise exception using
        message = 'You already submitted a recycling route request.',
        errcode = '23505',
        constraint = 'recycling_route_submission_locks_profile_id_key';
  end;

  insert into public.recycling_center_dropoff_requests (
    id,
    profile_id,
    selected_items,
    estimated_weight_kg,
    estimated_points,
    notes,
    center_id,
    center_name,
    center_address,
    center_township,
    center_hours,
    created_at,
    updated_at
  ) values (
    new_request_id,
    member_profile_id,
    selected_items,
    greatest(coalesce(estimated_weight_kg, 0), 0),
    greatest(coalesce(estimated_points, 0), 0),
    nullif(trim(request_notes), ''),
    nullif(trim(target_center_id), ''),
    trim(center_name),
    trim(center_address),
    trim(center_township),
    trim(center_hours),
    submitted_at,
    submitted_at
  );

  return query
  select new_request_id, 'PENDING'::public.recycling_route_request_status, submitted_at;
end;
$$;

create function public.admin_update_recycling_pickup_request(
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
    raise exception using message = 'Admin access required', errcode = '42501';
  end if;
  if nullif(trim(next_pickup_address), '') is null
     or nullif(trim(next_route_window), '') is null
     or nullif(trim(next_route_area), '') is null then
    raise exception using message = 'Pickup details are required', errcode = '22023';
  end if;

  update public.recycling_pickup_requests request
  set
    status = next_status,
    pickup_address = trim(next_pickup_address),
    route_window = trim(next_route_window),
    route_area = trim(next_route_area),
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where request.id = target_request_id
    and request.deleted_at is null;

  if not found then
    raise exception using message = 'Pickup request not found', errcode = 'P0002';
  end if;
  return target_request_id;
end;
$$;

create function public.admin_update_recycling_center_dropoff_request(
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
    raise exception using message = 'Admin access required', errcode = '42501';
  end if;
  if nullif(trim(next_center_name), '') is null
     or nullif(trim(next_center_address), '') is null
     or nullif(trim(next_center_township), '') is null
     or nullif(trim(next_center_hours), '') is null then
    raise exception using message = 'Recycle center details are required', errcode = '22023';
  end if;

  update public.recycling_center_dropoff_requests request
  set
    status = next_status,
    center_name = trim(next_center_name),
    center_address = trim(next_center_address),
    center_township = trim(next_center_township),
    center_hours = trim(next_center_hours),
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where request.id = target_request_id
    and request.deleted_at is null;

  if not found then
    raise exception using message = 'Center drop-off request not found', errcode = 'P0002';
  end if;
  return target_request_id;
end;
$$;

create function public.admin_delete_recycling_pickup_request(target_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception using message = 'Admin access required', errcode = '42501';
  end if;

  update public.recycling_pickup_requests request
  set deleted_at = coalesce(request.deleted_at, now()), updated_at = now()
  where request.id = target_request_id;

  if not found then
    raise exception using message = 'Pickup request not found', errcode = 'P0002';
  end if;
  return target_request_id;
end;
$$;

create function public.admin_delete_recycling_center_dropoff_request(target_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_profile_is_admin() then
    raise exception using message = 'Admin access required', errcode = '42501';
  end if;

  update public.recycling_center_dropoff_requests request
  set deleted_at = coalesce(request.deleted_at, now()), updated_at = now()
  where request.id = target_request_id;

  if not found then
    raise exception using message = 'Center drop-off request not found', errcode = 'P0002';
  end if;
  return target_request_id;
end;
$$;

revoke insert, update, delete on public.recycling_route_submission_locks from anon, authenticated;
revoke insert, update, delete on public.recycling_pickup_requests from anon, authenticated;
revoke insert, update, delete on public.recycling_center_dropoff_requests from anon, authenticated;
revoke select on public.recycling_route_submission_locks from anon;
revoke select on public.recycling_pickup_requests from anon;
revoke select on public.recycling_center_dropoff_requests from anon;
grant select on public.recycling_route_submission_locks to authenticated;
grant select on public.recycling_pickup_requests to authenticated;
grant select on public.recycling_center_dropoff_requests to authenticated;

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

notify pgrst, 'reload schema';
