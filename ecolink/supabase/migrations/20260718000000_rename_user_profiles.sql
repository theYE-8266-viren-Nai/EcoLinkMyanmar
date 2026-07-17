do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_profiles'
  ) then
    execute 'alter table public.user_profiles rename to profiles';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'clerk_user_id'
  ) then
    execute 'alter table public.profiles rename column clerk_user_id to auth_user_id';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    execute 'alter table public.profiles rename column full_name to display_name';
  end if;
end $$;

alter table if exists public.profiles drop column if exists points;
alter table if exists public.profiles drop column if exists role;

drop index if exists public.user_profiles_auth_user_id_key;
drop index if exists public.user_profiles_clerk_user_id_key;
drop index if exists public.profiles_auth_user_id_key;

create unique index if not exists profiles_auth_user_id_key
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid())::text = auth_user_id);

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid())::text = auth_user_id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid())::text = auth_user_id)
with check ((select auth.uid())::text = auth_user_id);

do $$
begin
  create type environment_waste_type as enum (
    'MIXED',
    'PLASTIC',
    'PAPER_CARDBOARD',
    'METAL',
    'GLASS',
    'ORGANIC',
    'E_WASTE',
    'HAZARDOUS',
    'OTHER'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.environment_reports (
  id uuid primary key default gen_random_uuid(),
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  dirtiness_score integer not null check (dirtiness_score between 1 and 10),
  waste_type environment_waste_type,
  notes text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists environment_reports_coordinates_idx
  on public.environment_reports (latitude, longitude);

create index if not exists environment_reports_observed_at_idx
  on public.environment_reports (observed_at desc, id desc);

create index if not exists environment_reports_waste_type_observed_at_idx
  on public.environment_reports (waste_type, observed_at desc);

grant select, insert on table public.environment_reports to anon, authenticated;
grant select, insert, update, delete on table public.environment_reports to service_role;

alter table public.environment_reports enable row level security;

drop policy if exists "Environment reports are public" on public.environment_reports;
drop policy if exists "Anyone can create an environment report" on public.environment_reports;

create policy "Environment reports are public"
on public.environment_reports
for select
to anon, authenticated
using (true);

create policy "Anyone can create an environment report"
on public.environment_reports
for insert
to anon, authenticated
with check (true);
