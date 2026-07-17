alter table public.profiles enable row level security;

drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check ((select public.request_user_id()) = auth_user_id);

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select public.request_user_id()) = auth_user_id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select public.request_user_id()) = auth_user_id)
with check ((select public.request_user_id()) = auth_user_id);

create or replace function public.ensure_current_profile(
  profile_display_name text,
  profile_email text
)
returns table (profile_id uuid, member_code text, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := public.request_user_id();
  generated_member_code text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(profile_display_name), '') is null then raise exception 'Display name is required'; end if;
  if nullif(trim(profile_email), '') is null then raise exception 'Email is required'; end if;

  generated_member_code := 'ECO-MM-' || upper(substr(md5(current_user_id), 1, 8));

  insert into public.profiles (
    id, auth_user_id, display_name, email, member_code, preferred_language,
    created_at, updated_at
  ) values (
    gen_random_uuid(), current_user_id, trim(profile_display_name),
    lower(trim(profile_email)), generated_member_code, 'en', now(), now()
  )
  on conflict (auth_user_id) where auth_user_id is not null
  do update set
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = now(),
    deleted_at = null;

  return query
  select profile.id, profile.member_code, profile.display_name
  from public.profiles profile
  where profile.auth_user_id = current_user_id;
end;
$$;

revoke all on function public.ensure_current_profile(text, text) from public, anon;
grant execute on function public.ensure_current_profile(text, text) to authenticated;

create or replace function public.get_current_staff_center()
returns table (center_id uuid, center_name text, township text)
language sql
stable
security definer
set search_path = ''
as $$
  select center.id, center.name, center.township
  from public.profiles profile
  join public.center_staff_assignments assignment
    on assignment.profile_id = profile.id and assignment.is_active
  join public.recycling_centers center
    on center.id = assignment.center_id and center.is_active
  where profile.auth_user_id = public.request_user_id()
  order by assignment.created_at
  limit 1
$$;

revoke all on function public.get_current_staff_center() from public, anon;
grant execute on function public.get_current_staff_center() to authenticated;
