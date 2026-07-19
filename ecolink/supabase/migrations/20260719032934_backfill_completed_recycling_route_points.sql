-- Credit requests that were already completed before calculated route awards
-- were introduced. The partial unique indexes keep this safe to rerun.

with awarded_pickups as (
  insert into public.point_ledger_entries (
    profile_id,
    recycling_pickup_request_id,
    points,
    entry_type,
    description
  )
  select
    request.profile_id,
    request.id,
    request.estimated_points::integer,
    'earned',
    'Completed recycling pickup'
  from public.recycling_pickup_requests request
  where request.status = 'COMPLETED'::public.recycling_route_request_status
    and request.deleted_at is null
    and request.estimated_points > 0
  on conflict (recycling_pickup_request_id) where recycling_pickup_request_id is not null do nothing
  returning profile_id, points
)
insert into public.user_notifications (profile_id, kind, title, message, href)
select
  award.profile_id,
  'points',
  'Recycling points added',
  award.points || ' points were added for your completed recycling pickup.',
  '/rewards'
from awarded_pickups award;

with awarded_dropoffs as (
  insert into public.point_ledger_entries (
    profile_id,
    recycling_center_dropoff_request_id,
    points,
    entry_type,
    description
  )
  select
    request.profile_id,
    request.id,
    request.estimated_points::integer,
    'earned',
    'Completed recycling center drop-off'
  from public.recycling_center_dropoff_requests request
  where request.status = 'COMPLETED'::public.recycling_route_request_status
    and request.deleted_at is null
    and request.estimated_points > 0
  on conflict (recycling_center_dropoff_request_id) where recycling_center_dropoff_request_id is not null do nothing
  returning profile_id, points
)
insert into public.user_notifications (profile_id, kind, title, message, href)
select
  award.profile_id,
  'points',
  'Recycling points added',
  award.points || ' points were added for your completed center drop-off.',
  '/rewards'
from awarded_dropoffs award;
