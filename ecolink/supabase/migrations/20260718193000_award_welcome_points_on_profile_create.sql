-- Award a one-time welcome bonus when an authenticated user gets their EcoLink profile.
create unique index if not exists point_ledger_entries_profile_welcome_bonus_key
  on public.point_ledger_entries (profile_id)
  where entry_type = 'earned' and description = 'Welcome bonus';

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
  ensured_profile_id uuid;
  created_new_profile boolean := false;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(profile_display_name), '') is null then raise exception 'Display name is required'; end if;
  if nullif(trim(profile_email), '') is null then raise exception 'Email is required'; end if;

  generated_member_code := 'ECO-MM-' || upper(substr(md5(current_user_id), 1, 8));
  perform pg_advisory_xact_lock(hashtext(current_user_id));

  select profile.id into ensured_profile_id
  from public.profiles profile
  where profile.auth_user_id = current_user_id
  for update;

  if ensured_profile_id is null then
    insert into public.profiles (
      id, auth_user_id, display_name, email, member_code, preferred_language,
      created_at, updated_at
    ) values (
      gen_random_uuid(), current_user_id, trim(profile_display_name),
      lower(trim(profile_email)), generated_member_code, 'en', now(), now()
    )
    returning id into ensured_profile_id;

    created_new_profile := true;
  else
    update public.profiles
    set
      display_name = trim(profile_display_name),
      email = lower(trim(profile_email)),
      updated_at = now(),
      deleted_at = null
    where id = ensured_profile_id;
  end if;

  if created_new_profile then
    insert into public.point_ledger_entries (
      profile_id,
      points,
      entry_type,
      description,
      created_at
    )
    select
      ensured_profile_id,
      50,
      'earned',
      'Welcome bonus',
      now()
    where not exists (
      select 1
      from public.point_ledger_entries ledger
      where ledger.profile_id = ensured_profile_id
        and ledger.entry_type = 'earned'
        and ledger.description = 'Welcome bonus'
    );
  end if;

  return query
  select profile.id, profile.member_code, profile.display_name
  from public.profiles profile
  where profile.id = ensured_profile_id;
end;
$$;

revoke all on function public.ensure_current_profile(text, text) from public, anon;
grant execute on function public.ensure_current_profile(text, text) to authenticated;
