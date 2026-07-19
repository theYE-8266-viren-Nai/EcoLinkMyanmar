-- Award the same calculated recycling points shown at submission when an admin
-- completes a pickup or center drop-off. The ledger source columns make the
-- award idempotent even if a request is reopened and completed again.

alter table public.point_ledger_entries
  add column if not exists recycling_pickup_request_id uuid
    references public.recycling_pickup_requests(id) on delete set null,
  add column if not exists recycling_center_dropoff_request_id uuid
    references public.recycling_center_dropoff_requests(id) on delete set null;

create unique index if not exists point_ledger_entries_recycling_pickup_request_key
  on public.point_ledger_entries (recycling_pickup_request_id)
  where recycling_pickup_request_id is not null;

create unique index if not exists point_ledger_entries_recycling_center_dropoff_request_key
  on public.point_ledger_entries (recycling_center_dropoff_request_id)
  where recycling_center_dropoff_request_id is not null;

create or replace function public.calculate_recycling_route_points(selected_items jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(
    case
      when lower(coalesce(item ->> 'itemType', '') || ' ' || coalesce(item ->> 'materialLabel', '')) like '%bottle%'
        and (
          nullif(item ->> 'materialSlug', '') is null
          or item ->> 'materialSlug' in ('pet-plastic', 'rigid-plastic')
          or lower(coalesce(item ->> 'itemType', '') || ' ' || coalesce(item ->> 'materialLabel', '')) like '%plastic%'
        )
      then case
        when coalesce((item ->> 'estimatedCount')::numeric, 0) > 0
          then round((item ->> 'estimatedCount')::numeric)::integer
        when coalesce((item ->> 'estimatedWeightKg')::numeric, 0) > 0
          then greatest(1, round((item ->> 'estimatedWeightKg')::numeric / 0.025)::integer)
        else 0
      end
      when coalesce((item ->> 'estimatedWeightKg')::numeric, 0) > 0
        and item ->> 'materialSlug' in (
          'pet-plastic', 'rigid-plastic', 'paper', 'cardboard', 'glass',
          'aluminium', 'steel', 'e-waste', 'batteries'
        )
      then greatest(1, round(
        (item ->> 'estimatedWeightKg')::numeric * case item ->> 'materialSlug'
          when 'pet-plastic' then 50
          when 'rigid-plastic' then 40
          when 'paper' then 20
          when 'cardboard' then 20
          when 'glass' then 25
          when 'aluminium' then 80
          when 'steel' then 35
          when 'e-waste' then 80
          when 'batteries' then 60
          else 0
        end
      )::integer)
      else 0
    end
  ), 0)::integer
  from jsonb_array_elements(
    case when jsonb_typeof(selected_items) = 'array' then selected_items else '[]'::jsonb end
  ) as selected(item);
$$;

create or replace function public.set_calculated_recycling_route_points()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.estimated_points := public.calculate_recycling_route_points(new.selected_items);
  return new;
end;
$$;

drop trigger if exists set_calculated_recycling_pickup_points on public.recycling_pickup_requests;
create trigger set_calculated_recycling_pickup_points
before insert or update of selected_items on public.recycling_pickup_requests
for each row execute function public.set_calculated_recycling_route_points();

drop trigger if exists set_calculated_recycling_center_dropoff_points on public.recycling_center_dropoff_requests;
create trigger set_calculated_recycling_center_dropoff_points
before insert or update of selected_items on public.recycling_center_dropoff_requests
for each row execute function public.set_calculated_recycling_route_points();

update public.recycling_pickup_requests request
set estimated_points = public.calculate_recycling_route_points(request.selected_items)
where request.estimated_points is distinct from public.calculate_recycling_route_points(request.selected_items);

update public.recycling_center_dropoff_requests request
set estimated_points = public.calculate_recycling_route_points(request.selected_items)
where request.estimated_points is distinct from public.calculate_recycling_route_points(request.selected_items);

create or replace function public.admin_update_recycling_pickup_request(
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
declare
  selected_schedule public.pickup_schedules%rowtype;
  request_row public.recycling_pickup_requests%rowtype;
  calculated_points integer;
  awarded_entry_id uuid;
begin
  if not public.current_profile_is_admin() then
    raise exception using message = 'Admin access required', errcode = '42501';
  end if;
  if nullif(trim(next_pickup_address), '') is null
     or next_latitude is null or next_latitude not between -90 and 90
     or next_longitude is null or next_longitude not between -180 and 180 then
    raise exception using message = 'Pickup address and map pin are required', errcode = '22023';
  end if;

  select * into selected_schedule
  from public.pickup_schedules schedule
  where schedule.id = next_schedule_id;
  if not found then
    raise exception using message = 'Pickup schedule not found', errcode = '22023';
  end if;

  select * into request_row
  from public.recycling_pickup_requests request
  where request.id = target_request_id and request.deleted_at is null
  for update;
  if not found then
    raise exception using message = 'Pickup request not found', errcode = 'P0002';
  end if;

  calculated_points := public.calculate_recycling_route_points(request_row.selected_items);

  update public.recycling_pickup_requests request set
    status = next_status,
    pickup_address = trim(next_pickup_address),
    schedule_id = selected_schedule.id,
    route_window = to_char(selected_schedule.starts_at at time zone 'Asia/Yangon', 'Dy, Mon DD · HH12:MI AM')
      || '–' || to_char(selected_schedule.ends_at at time zone 'Asia/Yangon', 'HH12:MI AM'),
    route_area = selected_schedule.route_area,
    latitude = next_latitude,
    longitude = next_longitude,
    estimated_points = calculated_points,
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where request.id = target_request_id;

  if next_status = 'COMPLETED'::public.recycling_route_request_status and calculated_points > 0 then
    insert into public.point_ledger_entries (
      profile_id, recycling_pickup_request_id, points, entry_type, description
    ) values (
      request_row.profile_id, request_row.id, calculated_points, 'earned', 'Completed recycling pickup'
    )
    on conflict (recycling_pickup_request_id) where recycling_pickup_request_id is not null do nothing
    returning id into awarded_entry_id;

    if awarded_entry_id is not null then
      insert into public.user_notifications (profile_id, kind, title, message, href)
      values (
        request_row.profile_id,
        'points',
        'Recycling points added',
        calculated_points || ' points were added for your completed recycling pickup.',
        '/rewards'
      );
    end if;
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
declare
  request_row public.recycling_center_dropoff_requests%rowtype;
  calculated_points integer;
  awarded_entry_id uuid;
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

  select * into request_row
  from public.recycling_center_dropoff_requests request
  where request.id = target_request_id and request.deleted_at is null
  for update;
  if not found then
    raise exception using message = 'Center drop-off request not found', errcode = 'P0002';
  end if;

  calculated_points := public.calculate_recycling_route_points(request_row.selected_items);

  update public.recycling_center_dropoff_requests request
  set
    status = next_status,
    center_name = trim(next_center_name),
    center_address = trim(next_center_address),
    center_township = trim(next_center_township),
    center_hours = trim(next_center_hours),
    estimated_points = calculated_points,
    notes = nullif(trim(next_notes), ''),
    updated_at = now()
  where request.id = target_request_id;

  if next_status = 'COMPLETED'::public.recycling_route_request_status and calculated_points > 0 then
    insert into public.point_ledger_entries (
      profile_id, recycling_center_dropoff_request_id, points, entry_type, description
    ) values (
      request_row.profile_id, request_row.id, calculated_points, 'earned', 'Completed recycling center drop-off'
    )
    on conflict (recycling_center_dropoff_request_id) where recycling_center_dropoff_request_id is not null do nothing
    returning id into awarded_entry_id;

    if awarded_entry_id is not null then
      insert into public.user_notifications (profile_id, kind, title, message, href)
      values (
        request_row.profile_id,
        'points',
        'Recycling points added',
        calculated_points || ' points were added for your completed center drop-off.',
        '/rewards'
      );
    end if;
  end if;

  return target_request_id;
end;
$$;

revoke all on function public.calculate_recycling_route_points(jsonb) from public, anon, authenticated;
revoke all on function public.set_calculated_recycling_route_points() from public, anon, authenticated;
revoke all on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, uuid, double precision, double precision, text) from public, anon;
revoke all on function public.admin_update_recycling_center_dropoff_request(uuid, public.recycling_route_request_status, text, text, text, text, text) from public, anon;
grant execute on function public.admin_update_recycling_pickup_request(uuid, public.recycling_route_request_status, text, uuid, double precision, double precision, text) to authenticated;
grant execute on function public.admin_update_recycling_center_dropoff_request(uuid, public.recycling_route_request_status, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
