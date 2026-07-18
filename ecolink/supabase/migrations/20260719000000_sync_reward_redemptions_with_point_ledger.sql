-- Keep the rewards page and redemption result on the same point ledger used by
-- the member dashboard. Lock the member profile during redemption so two
-- concurrent requests cannot both spend the same balance.

create or replace function public.get_current_points_balance()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  available_points integer;
begin
  if public.request_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select profile.id into member_profile_id
  from public.profiles profile
  where profile.auth_user_id = public.request_user_id();

  if member_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select coalesce(sum(ledger.points), 0)::integer into available_points
  from public.point_ledger_entries ledger
  where ledger.profile_id = member_profile_id;

  return available_points;
end;
$$;

drop function if exists public.redeem_partner_reward(uuid);

create function public.redeem_partner_reward(reward_id uuid)
returns table (redemption_id uuid, claim_code text, balance integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_profile_id uuid;
  available_points integer;
  offer public.partner_reward_offers%rowtype;
  new_redemption_id uuid;
  new_claim_code text;
begin
  if public.request_user_id() is null then
    raise exception 'Authentication required';
  end if;

  select profile.id into member_profile_id
  from public.profiles profile
  where profile.auth_user_id = public.request_user_id()
  for update;

  if member_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select coalesce(sum(ledger.points), 0)::integer into available_points
  from public.point_ledger_entries ledger
  where ledger.profile_id = member_profile_id;

  select * into offer
  from public.partner_reward_offers reward_offer
  where reward_offer.id = reward_id
    and reward_offer.is_active
    and reward_offer.stock > 0
  for update;

  if offer.id is null then
    raise exception 'Reward unavailable';
  end if;
  if available_points < offer.points_cost then
    raise exception 'Not enough points';
  end if;

  new_claim_code := 'ECO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.partner_reward_redemptions (
    profile_id,
    reward_offer_id,
    claim_code,
    points_spent
  ) values (
    member_profile_id,
    offer.id,
    new_claim_code,
    offer.points_cost
  )
  returning id into new_redemption_id;

  insert into public.point_ledger_entries (
    profile_id,
    center_id,
    points,
    entry_type,
    description
  ) values (
    member_profile_id,
    offer.center_id,
    -offer.points_cost,
    'redeemed',
    'Partner reward reservation'
  );

  update public.partner_reward_offers reward_offer
  set stock = reward_offer.stock - 1,
      updated_at = now()
  where reward_offer.id = offer.id;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (
    member_profile_id,
    'reward',
    'Reward reserved',
    offer.title || ' is ready to collect.',
    '/rewards'
  );

  return query
  select new_redemption_id, new_claim_code, available_points - offer.points_cost;
end;
$$;

revoke all on function public.get_current_points_balance() from public, anon;
revoke all on function public.redeem_partner_reward(uuid) from public, anon;
grant execute on function public.get_current_points_balance() to authenticated;
grant execute on function public.redeem_partner_reward(uuid) to authenticated;

notify pgrst, 'reload schema';
