-- Give every existing EcoLink profile the same one-time starting balance.
-- Future profiles are handled by ensure_current_profile.
create unique index if not exists point_ledger_entries_profile_welcome_bonus_key
  on public.point_ledger_entries (profile_id)
  where entry_type = 'earned' and description = 'Welcome bonus';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.point_ledger_entries'::regclass
      and contype = 'f'
      and conname = 'point_ledger_entries_profile_id_fkey'
  ) then
    alter table public.point_ledger_entries
      add constraint point_ledger_entries_profile_id_fkey
      foreign key (profile_id)
      references public.profiles(id)
      on delete restrict
      not valid;
  end if;
end $$;

insert into public.point_ledger_entries (
  profile_id,
  points,
  entry_type,
  description,
  created_at
)
select
  profile.id,
  50,
  'earned',
  'Welcome bonus',
  now()
from public.profiles profile
where profile.deleted_at is null
  and not exists (
    select 1
    from public.point_ledger_entries ledger
    where ledger.profile_id = profile.id
      and ledger.entry_type = 'earned'
      and ledger.description = 'Welcome bonus'
  );
