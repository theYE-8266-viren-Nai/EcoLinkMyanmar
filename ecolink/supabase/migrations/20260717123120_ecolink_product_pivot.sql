create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists member_code text;

create unique index if not exists profiles_member_code_key
  on public.profiles (member_code)
  where member_code is not null;

create table if not exists public.recycling_centers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  township text not null,
  address text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  opening_hours text not null,
  accepted_materials text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.center_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.recycling_centers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'operator' check (role in ('manager', 'operator')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (center_id, profile_id)
);

create table if not exists public.verified_drop_offs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.recycling_centers(id) on delete restrict,
  member_profile_id uuid not null references public.profiles(id) on delete restrict,
  recorded_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  material_slug text not null,
  weight_kg numeric(10, 2) not null check (weight_kg > 0 and weight_kg <= 500),
  points_awarded integer not null check (points_awarded > 0),
  recorded_at timestamptz not null default now()
);

create index if not exists verified_drop_offs_member_recorded_at_idx
  on public.verified_drop_offs (member_profile_id, recorded_at desc);

create index if not exists verified_drop_offs_center_recorded_at_idx
  on public.verified_drop_offs (center_id, recorded_at desc);

create table if not exists public.point_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  center_id uuid references public.recycling_centers(id) on delete set null,
  drop_off_id uuid unique references public.verified_drop_offs(id) on delete set null,
  points integer not null check (points <> 0),
  entry_type text not null check (entry_type in ('earned', 'redeemed', 'adjusted', 'refunded')),
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists point_ledger_entries_profile_created_at_idx
  on public.point_ledger_entries (profile_id, created_at desc);

create table if not exists public.partner_reward_offers (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.recycling_centers(id) on delete set null,
  title text not null,
  description text not null,
  township text not null,
  points_cost integer not null check (points_cost > 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  reward_offer_id uuid not null references public.partner_reward_offers(id) on delete restrict,
  claim_code text not null unique,
  points_spent integer not null check (points_spent > 0),
  status text not null default 'reserved' check (status in ('reserved', 'fulfilled', 'cancelled', 'refunded')),
  fulfilled_at timestamptz,
  fulfilled_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('points', 'reward', 'report', 'center', 'system')),
  title text not null,
  message text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_profile_created_at_idx
  on public.user_notifications (profile_id, created_at desc);

alter table public.environment_reports
  add column if not exists reporter_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists issue_type text,
  add column if not exists severity text,
  add column if not exists status text not null default 'submitted',
  add column if not exists photo_storage_path text;

alter table public.recycling_centers enable row level security;
alter table public.center_staff_assignments enable row level security;
alter table public.verified_drop_offs enable row level security;
alter table public.point_ledger_entries enable row level security;
alter table public.partner_reward_offers enable row level security;
alter table public.partner_reward_redemptions enable row level security;
alter table public.user_notifications enable row level security;

grant select on public.recycling_centers, public.partner_reward_offers to anon, authenticated;
grant select on public.center_staff_assignments, public.verified_drop_offs,
  public.point_ledger_entries, public.partner_reward_redemptions,
  public.user_notifications to authenticated;

create policy "Active centers are public"
on public.recycling_centers for select
to anon, authenticated
using (is_active);

create policy "Active rewards are public"
on public.partner_reward_offers for select
to anon, authenticated
using (is_active);

create policy "Staff can read their assignments"
on public.center_staff_assignments for select
to authenticated
using (
  profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
);

create policy "Members can read their drop-offs"
on public.verified_drop_offs for select
to authenticated
using (
  member_profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
  or center_id in (
    select assignment.center_id
    from public.center_staff_assignments assignment
    join public.profiles profile on profile.id = assignment.profile_id
    where profile.auth_user_id = (select auth.uid())::text
      and assignment.is_active
  )
);

create policy "Members can read their point ledger"
on public.point_ledger_entries for select
to authenticated
using (
  profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
);

create policy "Members can read their reward redemptions"
on public.partner_reward_redemptions for select
to authenticated
using (
  profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
);

create policy "Members can read their notifications"
on public.user_notifications for select
to authenticated
using (
  profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
);

create policy "Members can update their notifications"
on public.user_notifications for update
to authenticated
using (
  profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
)
with check (
  profile_id in (
    select id from public.profiles
    where auth_user_id = (select auth.uid())::text
  )
);

create or replace function public.record_center_drop_off(
  member_code text,
  material_slug text,
  weight_kg numeric
)
returns table (drop_off_id uuid, points_awarded integer, center_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_profile_id uuid;
  assigned_center_id uuid;
  member_profile_id uuid;
  new_drop_off_id uuid;
  awarded_points integer;
  points_per_kg integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select profile.id into staff_profile_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()::text;

  select assignment.center_id into assigned_center_id
  from public.center_staff_assignments assignment
  where assignment.profile_id = staff_profile_id
    and assignment.is_active
  order by assignment.created_at
  limit 1;

  if assigned_center_id is null then
    raise exception 'No active center assignment';
  end if;

  select profile.id into member_profile_id
  from public.profiles profile
  where upper(profile.member_code) = upper(record_center_drop_off.member_code);

  if member_profile_id is null then
    raise exception 'Member code not found';
  end if;

  if weight_kg <= 0 or weight_kg > 500 then
    raise exception 'Weight must be between 0 and 500 kilograms';
  end if;

  points_per_kg := case material_slug
    when 'pet-plastic' then 50
    when 'rigid-plastic' then 40
    when 'paper' then 20
    when 'cardboard' then 20
    when 'glass' then 25
    when 'aluminium' then 80
    when 'steel' then 35
    when 'e-waste' then 80
    when 'batteries' then 60
    else 15
  end;
  awarded_points := greatest(1, round(weight_kg * points_per_kg)::integer);

  insert into public.verified_drop_offs (
    center_id, member_profile_id, recorded_by_profile_id,
    material_slug, weight_kg, points_awarded
  ) values (
    assigned_center_id, member_profile_id, staff_profile_id,
    material_slug, weight_kg, awarded_points
  ) returning id into new_drop_off_id;

  insert into public.point_ledger_entries (
    profile_id, center_id, drop_off_id, points, entry_type, description
  ) values (
    member_profile_id, assigned_center_id, new_drop_off_id,
    awarded_points, 'earned', 'Verified recycling drop-off'
  );

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (
    member_profile_id,
    'points',
    'Points added',
    awarded_points || ' points were added for your verified drop-off.',
    '/'
  );

  return query select new_drop_off_id, awarded_points, assigned_center_id;
end;
$$;

revoke all on function public.record_center_drop_off(text, text, numeric) from public, anon;
grant execute on function public.record_center_drop_off(text, text, numeric) to authenticated;

create or replace function public.redeem_partner_reward(reward_id uuid)
returns table (redemption_id uuid, claim_code text)
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
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select id into member_profile_id from public.profiles
  where auth_user_id = auth.uid()::text;
  if member_profile_id is null then raise exception 'Profile not found'; end if;

  select coalesce(sum(points), 0)::integer into available_points
  from public.point_ledger_entries where profile_id = member_profile_id;

  select * into offer from public.partner_reward_offers
  where id = reward_id and is_active and stock > 0 for update;
  if offer.id is null then raise exception 'Reward unavailable'; end if;
  if available_points < offer.points_cost then raise exception 'Not enough points'; end if;

  new_claim_code := 'ECO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.partner_reward_redemptions (
    profile_id, reward_offer_id, claim_code, points_spent
  ) values (
    member_profile_id, offer.id, new_claim_code, offer.points_cost
  ) returning id into new_redemption_id;

  insert into public.point_ledger_entries (
    profile_id, center_id, points, entry_type, description
  ) values (
    member_profile_id, offer.center_id, -offer.points_cost, 'redeemed', 'Partner reward reservation'
  );

  update public.partner_reward_offers set stock = stock - 1, updated_at = now()
  where id = offer.id;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (member_profile_id, 'reward', 'Reward reserved', offer.title || ' is ready to collect.', '/rewards');

  return query select new_redemption_id, new_claim_code;
end;
$$;

revoke all on function public.redeem_partner_reward(uuid) from public, anon;
grant execute on function public.redeem_partner_reward(uuid) to authenticated;

create or replace function public.fulfill_partner_reward(reward_claim_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_profile_id uuid;
  assigned_center_id uuid;
  redemption public.partner_reward_redemptions%rowtype;
  offer_center_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into staff_profile_id from public.profiles
  where auth_user_id = auth.uid()::text;
  select center_id into assigned_center_id from public.center_staff_assignments
  where profile_id = staff_profile_id and is_active order by created_at limit 1;
  if assigned_center_id is null then raise exception 'No active center assignment'; end if;

  select redemption_row.* into redemption
  from public.partner_reward_redemptions redemption_row
  where upper(redemption_row.claim_code) = upper(reward_claim_code)
    and redemption_row.status = 'reserved'
  for update;
  if redemption.id is null then raise exception 'Reward claim not found'; end if;

  select center_id into offer_center_id from public.partner_reward_offers
  where id = redemption.reward_offer_id;
  if offer_center_id is distinct from assigned_center_id then
    raise exception 'Reward belongs to a different center';
  end if;

  update public.partner_reward_redemptions
  set status = 'fulfilled', fulfilled_at = now(), fulfilled_by_profile_id = staff_profile_id
  where id = redemption.id;

  insert into public.user_notifications (profile_id, kind, title, message, href)
  values (redemption.profile_id, 'reward', 'Reward collected', 'Your partner reward was collected successfully.', '/rewards');
  return redemption.id;
end;
$$;

revoke all on function public.fulfill_partner_reward(text) from public, anon;
grant execute on function public.fulfill_partner_reward(text) to authenticated;
