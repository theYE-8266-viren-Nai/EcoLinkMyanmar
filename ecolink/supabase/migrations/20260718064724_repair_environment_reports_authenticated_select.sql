-- The live waste-map migration correctly moved anonymous reads behind the
-- get_public_waste_map RPC, but it also removed the table privilege required
-- for authenticated member/admin RLS policies to run.
grant select on table public.environment_reports to authenticated;
revoke select on table public.environment_reports from anon;
