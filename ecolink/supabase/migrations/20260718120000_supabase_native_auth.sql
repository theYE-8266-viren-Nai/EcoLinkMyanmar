create or replace function public.request_user_id()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid()::text
$$;

revoke all on function public.request_user_id() from public, anon;
grant execute on function public.request_user_id() to authenticated;
