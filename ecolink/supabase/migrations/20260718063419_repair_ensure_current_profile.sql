-- The deployed profiles table predates the column shape used by
-- ensure_current_profile. Restore the columns expected by the RPC, seed data,
-- and generated database types without rewriting an applied migration.
alter table public.profiles
  add column if not exists preferred_language text not null default 'en',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;
