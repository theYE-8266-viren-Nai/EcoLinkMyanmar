create extension if not exists "pgcrypto";

drop type if exists "OrganizationType" cascade;
drop type if exists "VerificationStatus" cascade;
drop type if exists "MembershipRole" cascade;
drop type if exists "MembershipStatus" cascade;
drop type if exists "RecyclingRequestStatus" cascade;
drop type if exists "PickupStatus" cascade;
drop type if exists "RewardEntryType" cascade;
drop type if exists "RewardSourceType" cascade;
drop type if exists "RewardOfferStatus" cascade;
drop type if exists "RewardRedemptionStatus" cascade;
drop type if exists "ContentStatus" cascade;
drop type if exists "CampaignStatus" cascade;
drop type if exists "CampaignParticipationStatus" cascade;
drop type if exists "ImpactScopeType" cascade;
drop type if exists "NotificationType" cascade;
drop type if exists "EnvironmentWasteType" cascade;

alter table if exists public."UserProfile" rename to user_profiles;
alter table if exists public.user_profiles add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
alter table if exists public.user_profiles rename column "displayName" to display_name;
alter table if exists public.user_profiles rename column "avatarUrl" to avatar_url;
alter table if exists public.user_profiles rename column "preferredLanguage" to preferred_language;
alter table if exists public.user_profiles rename column "createdAt" to created_at;
alter table if exists public.user_profiles rename column "updatedAt" to updated_at;
alter table if exists public.user_profiles rename column "deletedAt" to deleted_at;
alter table if exists public.user_profiles drop column if exists "clerkUserId";
alter table if exists public.user_profiles drop column if exists "defaultAddressId";

drop table if exists
  public."Address",
  public."Organization",
  public."OrganizationMembership",
  public."OrganizationVerification",
  public."MaterialCategory",
  public."OrganizationAcceptedMaterial",
  public."RecyclingRequest",
  public."RecyclingRequestItem",
  public."Pickup",
  public."RewardOffer",
  public."RewardLedgerEntry",
  public."RewardRedemption",
  public."EducationContent",
  public."CommunityCampaign",
  public."CampaignParticipant",
  public."ImpactRecord",
  public."Notification",
  public."AuditLog"
cascade;

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

create unique index if not exists user_profiles_auth_user_id_key
  on public.user_profiles (auth_user_id)
  where auth_user_id is not null;

grant select, insert, update, delete on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;
grant select, insert on table public.environment_reports to anon, authenticated;
grant select, insert, update, delete on table public.environment_reports to service_role;

alter table public.user_profiles enable row level security;
alter table public.environment_reports enable row level security;

create policy "Users can insert their own profile"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = auth_user_id);

create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

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
