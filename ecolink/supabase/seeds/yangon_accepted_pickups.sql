-- Demo-only accepted pickup requests for the next Saturday Yangon routes.
-- Coordinates are intentionally spread around the Hlaing and Tamwe depots so
-- both closed loops contain enough stops to demonstrate the routing map.

insert into public.profiles (
  id, auth_user_id, display_name, email, member_code, app_role, preferred_language, created_at, updated_at
)
select
  ('41000000-0000-0000-0000-' || lpad(member_number::text, 12, '0'))::uuid,
  'route-demo-member-' || lpad(member_number::text, 2, '0'),
  'Route Demo Member ' || lpad(member_number::text, 2, '0'),
  'route-demo-' || lpad(member_number::text, 2, '0') || '@ecolink.local',
  'ECO-MM-ROUTE-' || lpad(member_number::text, 2, '0'),
  'member',
  'en',
  now(),
  now()
from generate_series(1, 28) as members(member_number)
on conflict (id) do update set
  auth_user_id = excluded.auth_user_id,
  display_name = excluded.display_name,
  email = excluded.email,
  member_code = excluded.member_code,
  app_role = excluded.app_role,
  deleted_at = null,
  updated_at = now();

do $$
declare
  local_reference timestamp := now() at time zone 'Asia/Yangon';
  schedule_date date;
  schedule_start timestamptz;
  schedule_end timestamptz;
  target_schedule_id uuid;
begin
  schedule_date := local_reference::date
    + mod(6 - extract(dow from local_reference)::integer + 7, 7);
  if extract(dow from local_reference)::integer = 6 and local_reference::time >= time '11:00' then
    schedule_date := schedule_date + 7;
  end if;
  schedule_start := (schedule_date + time '08:00') at time zone 'Asia/Yangon';
  schedule_end := schedule_start + interval '3 hours';

  insert into public.pickup_schedules (starts_at, ends_at, route_area, status)
  values (schedule_start, schedule_end, 'Yangon partner route', 'OPEN')
  on conflict (starts_at) do update set
    ends_at = excluded.ends_at,
    route_area = excluded.route_area,
    updated_at = now()
  returning id into target_schedule_id;

  insert into public.recycling_pickup_requests (
    id,
    profile_id,
    selected_items,
    estimated_weight_kg,
    estimated_points,
    notes,
    status,
    pickup_address,
    route_window,
    route_area,
    schedule_id,
    latitude,
    longitude,
    created_at,
    updated_at
  )
  select
    seed.request_id,
    seed.profile_id,
    seed.selected_items,
    seed.estimated_weight_kg,
    0,
    'Demo accepted pickup for route-map presentation.',
    'ACCEPTED'::public.recycling_route_request_status,
    seed.pickup_address,
    to_char(schedule_start at time zone 'Asia/Yangon', 'Dy, Mon DD · HH12:MI AM')
      || '–' || to_char(schedule_end at time zone 'Asia/Yangon', 'HH12:MI AM'),
    'Yangon partner route',
    target_schedule_id,
    seed.latitude,
    seed.longitude,
    now() - make_interval(mins => seed.submitted_minutes_ago),
    now()
  from (
    values
      ('42000000-0000-0000-0000-000000000001'::uuid, '41000000-0000-0000-0000-000000000001'::uuid, 'Hledan Market, Kamayut Township', 16.828300::numeric, 96.129600::numeric, 35, '[{"itemType":"Plastic bottles","materialLabel":"PET plastic","materialSlug":"pet-plastic","estimatedCount":18,"estimatedWeightKg":0.45}]'::jsonb, 0.45::numeric),
      ('42000000-0000-0000-0000-000000000002'::uuid, '41000000-0000-0000-0000-000000000002'::uuid, 'University Avenue, Kamayut Township', 16.825000, 96.130800, 42, '[{"itemType":"Cardboard boxes","materialLabel":"Cardboard","materialSlug":"cardboard","estimatedCount":6,"estimatedWeightKg":3.2}]'::jsonb, 3.20),
      ('42000000-0000-0000-0000-000000000003'::uuid, '41000000-0000-0000-0000-000000000003'::uuid, 'Bagaya Road, Sanchaung Township', 16.806500, 96.135200, 49, '[{"itemType":"Paper bundles","materialLabel":"Paper","materialSlug":"paper","estimatedCount":8,"estimatedWeightKg":4.5}]'::jsonb, 4.50),
      ('42000000-0000-0000-0000-000000000004'::uuid, '41000000-0000-0000-0000-000000000004'::uuid, 'Parami Road, Hlaing Township', 16.846000, 96.126500, 56, '[{"itemType":"Plastic containers","materialLabel":"Rigid plastic","materialSlug":"rigid-plastic","estimatedCount":12,"estimatedWeightKg":2.1}]'::jsonb, 2.10),
      ('42000000-0000-0000-0000-000000000005'::uuid, '41000000-0000-0000-0000-000000000005'::uuid, 'Lower Mingaladon Road, Insein Township', 16.889000, 96.107000, 63, '[{"itemType":"Glass jars","materialLabel":"Glass","materialSlug":"glass","estimatedCount":14,"estimatedWeightKg":5.8}]'::jsonb, 5.80),
      ('42000000-0000-0000-0000-000000000006'::uuid, '41000000-0000-0000-0000-000000000006'::uuid, 'Kabar Aye Pagoda Road, Mayangone Township', 16.866500, 96.142000, 70, '[{"itemType":"Aluminium cans","materialLabel":"Aluminium","materialSlug":"aluminium","estimatedCount":22,"estimatedWeightKg":1.4}]'::jsonb, 1.40),
      ('42000000-0000-0000-0000-000000000007'::uuid, '41000000-0000-0000-0000-000000000007'::uuid, 'Sin Min Road, Ahlone Township', 16.789000, 96.131000, 77, '[{"itemType":"Steel tins","materialLabel":"Steel","materialSlug":"steel","estimatedCount":10,"estimatedWeightKg":2.8}]'::jsonb, 2.80),
      ('42000000-0000-0000-0000-000000000008'::uuid, '41000000-0000-0000-0000-000000000008'::uuid, 'Maha Bandula Road, Lanmadaw Township', 16.776800, 96.144000, 84, '[{"itemType":"Plastic bottles","materialLabel":"PET plastic","materialSlug":"pet-plastic","estimatedCount":26,"estimatedWeightKg":0.65}]'::jsonb, 0.65),
      ('42000000-0000-0000-0000-000000000009'::uuid, '41000000-0000-0000-0000-000000000009'::uuid, 'Upper Kyeemyindaing Road, Kyimyindaing Township', 16.807700, 96.126000, 91, '[{"itemType":"Cardboard boxes","materialLabel":"Cardboard","materialSlug":"cardboard","estimatedCount":9,"estimatedWeightKg":4.1}]'::jsonb, 4.10),
      ('42000000-0000-0000-0000-000000000010'::uuid, '41000000-0000-0000-0000-000000000010'::uuid, 'Shwedagon Pagoda Road, Dagon Township', 16.794500, 96.147500, 98, '[{"itemType":"Paper bundles","materialLabel":"Paper","materialSlug":"paper","estimatedCount":7,"estimatedWeightKg":3.6}]'::jsonb, 3.60),
      ('42000000-0000-0000-0000-000000000011'::uuid, '41000000-0000-0000-0000-000000000011'::uuid, 'No. 3 Main Road, Mingaladon Township', 16.907500, 96.133000, 105, '[{"itemType":"Plastic containers","materialLabel":"Rigid plastic","materialSlug":"rigid-plastic","estimatedCount":15,"estimatedWeightKg":2.9}]'::jsonb, 2.90),
      ('42000000-0000-0000-0000-000000000012'::uuid, '41000000-0000-0000-0000-000000000012'::uuid, 'Bayint Naung Road, Shwepyitha Township', 16.952000, 96.097000, 112, '[{"itemType":"Glass bottles","materialLabel":"Glass","materialSlug":"glass","estimatedCount":18,"estimatedWeightKg":7.2}]'::jsonb, 7.20),
      ('42000000-0000-0000-0000-000000000013'::uuid, '41000000-0000-0000-0000-000000000013'::uuid, 'Bayint Naung Market, Mayangone Township', 16.852500, 96.117000, 119, '[{"itemType":"Aluminium cans","materialLabel":"Aluminium","materialSlug":"aluminium","estimatedCount":30,"estimatedWeightKg":1.9}]'::jsonb, 1.90),
      ('42000000-0000-0000-0000-000000000014'::uuid, '41000000-0000-0000-0000-000000000014'::uuid, 'Yangon-Pathein Road, Hlaing Tharyar Township', 16.866000, 96.071000, 126, '[{"itemType":"E-waste devices","materialLabel":"E-waste","materialSlug":"e-waste","estimatedCount":4,"estimatedWeightKg":3.4}]'::jsonb, 3.40),
      ('42000000-0000-0000-0000-000000000015'::uuid, '41000000-0000-0000-0000-000000000015'::uuid, 'U Chit Maung Road, Tamwe Township', 16.810300, 96.176100, 133, '[{"itemType":"Plastic bottles","materialLabel":"PET plastic","materialSlug":"pet-plastic","estimatedCount":21,"estimatedWeightKg":0.53}]'::jsonb, 0.53),
      ('42000000-0000-0000-0000-000000000016'::uuid, '41000000-0000-0000-0000-000000000016'::uuid, 'Saya San Road, Yankin Township', 16.827300, 96.173700, 140, '[{"itemType":"Cardboard boxes","materialLabel":"Cardboard","materialSlug":"cardboard","estimatedCount":8,"estimatedWeightKg":4.0}]'::jsonb, 4.00),
      ('42000000-0000-0000-0000-000000000017'::uuid, '41000000-0000-0000-0000-000000000017'::uuid, 'Kabar Aye Pagoda Road, Bahan Township', 16.816800, 96.158700, 147, '[{"itemType":"Paper bundles","materialLabel":"Paper","materialSlug":"paper","estimatedCount":10,"estimatedWeightKg":5.1}]'::jsonb, 5.10),
      ('42000000-0000-0000-0000-000000000018'::uuid, '41000000-0000-0000-0000-000000000018'::uuid, 'Lay Daungkan Road, Thingangyun Township', 16.829000, 96.202000, 154, '[{"itemType":"Plastic containers","materialLabel":"Rigid plastic","materialSlug":"rigid-plastic","estimatedCount":11,"estimatedWeightKg":2.4}]'::jsonb, 2.40),
      ('42000000-0000-0000-0000-000000000019'::uuid, '41000000-0000-0000-0000-000000000019'::uuid, 'Waizayantar Road, South Okkalapa Township', 16.844000, 96.192000, 161, '[{"itemType":"Glass jars","materialLabel":"Glass","materialSlug":"glass","estimatedCount":16,"estimatedWeightKg":6.3}]'::jsonb, 6.30),
      ('42000000-0000-0000-0000-000000000020'::uuid, '41000000-0000-0000-0000-000000000020'::uuid, 'Thudhamma Road, North Okkalapa Township', 16.878000, 96.173000, 168, '[{"itemType":"Aluminium cans","materialLabel":"Aluminium","materialSlug":"aluminium","estimatedCount":25,"estimatedWeightKg":1.6}]'::jsonb, 1.60),
      ('42000000-0000-0000-0000-000000000021'::uuid, '41000000-0000-0000-0000-000000000021'::uuid, 'Min Nandar Road, Thaketa Township', 16.790000, 96.197000, 175, '[{"itemType":"Steel tins","materialLabel":"Steel","materialSlug":"steel","estimatedCount":13,"estimatedWeightKg":3.1}]'::jsonb, 3.10),
      ('42000000-0000-0000-0000-000000000022'::uuid, '41000000-0000-0000-0000-000000000022'::uuid, 'Yamonnar Road, Dawbon Township', 16.786000, 96.183000, 182, '[{"itemType":"Plastic bottles","materialLabel":"PET plastic","materialSlug":"pet-plastic","estimatedCount":17,"estimatedWeightKg":0.43}]'::jsonb, 0.43),
      ('42000000-0000-0000-0000-000000000023'::uuid, '41000000-0000-0000-0000-000000000023'::uuid, 'Lower Pazundaung Road, Pazundaung Township', 16.783000, 96.172000, 189, '[{"itemType":"Cardboard boxes","materialLabel":"Cardboard","materialSlug":"cardboard","estimatedCount":7,"estimatedWeightKg":3.7}]'::jsonb, 3.70),
      ('42000000-0000-0000-0000-000000000024'::uuid, '41000000-0000-0000-0000-000000000024'::uuid, 'Merchant Road, Botataung Township', 16.772000, 96.170000, 196, '[{"itemType":"Paper bundles","materialLabel":"Paper","materialSlug":"paper","estimatedCount":9,"estimatedWeightKg":4.2}]'::jsonb, 4.20),
      ('42000000-0000-0000-0000-000000000025'::uuid, '41000000-0000-0000-0000-000000000025'::uuid, 'Thein Phyu Road, Mingalar Taung Nyunt Township', 16.792000, 96.170000, 203, '[{"itemType":"Plastic containers","materialLabel":"Rigid plastic","materialSlug":"rigid-plastic","estimatedCount":14,"estimatedWeightKg":2.7}]'::jsonb, 2.70),
      ('42000000-0000-0000-0000-000000000026'::uuid, '41000000-0000-0000-0000-000000000026'::uuid, 'Yadanar Road, Dagon Seikkan Township', 16.830000, 96.236000, 210, '[{"itemType":"Glass bottles","materialLabel":"Glass","materialSlug":"glass","estimatedCount":20,"estimatedWeightKg":8.0}]'::jsonb, 8.00),
      ('42000000-0000-0000-0000-000000000027'::uuid, '41000000-0000-0000-0000-000000000027'::uuid, 'Bo Min Yaung Road, East Dagon Township', 16.902000, 96.215000, 217, '[{"itemType":"Batteries","materialLabel":"Batteries","materialSlug":"batteries","estimatedCount":12,"estimatedWeightKg":2.2}]'::jsonb, 2.20),
      ('42000000-0000-0000-0000-000000000028'::uuid, '41000000-0000-0000-0000-000000000028'::uuid, 'Hlawga Road, South Dagon Township', 16.846000, 96.225000, 224, '[{"itemType":"E-waste devices","materialLabel":"E-waste","materialSlug":"e-waste","estimatedCount":5,"estimatedWeightKg":4.6}]'::jsonb, 4.60)
  ) as seed(
    request_id,
    profile_id,
    pickup_address,
    latitude,
    longitude,
    submitted_minutes_ago,
    selected_items,
    estimated_weight_kg
  )
  on conflict (id) do update set
    profile_id = excluded.profile_id,
    selected_items = excluded.selected_items,
    estimated_weight_kg = excluded.estimated_weight_kg,
    notes = excluded.notes,
    status = excluded.status,
    pickup_address = excluded.pickup_address,
    route_window = excluded.route_window,
    route_area = excluded.route_area,
    schedule_id = excluded.schedule_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    deleted_at = null,
    updated_at = now();

  insert into public.recycling_route_submission_locks (
    id, profile_id, route_type, request_id, created_at
  )
  select
    ('43000000-0000-0000-0000-' || lpad(member_number::text, 12, '0'))::uuid,
    ('41000000-0000-0000-0000-' || lpad(member_number::text, 12, '0'))::uuid,
    'pickup',
    ('42000000-0000-0000-0000-' || lpad(member_number::text, 12, '0'))::uuid,
    now()
  from generate_series(1, 28) as members(member_number)
  on conflict (profile_id) do update set
    route_type = excluded.route_type,
    request_id = excluded.request_id;

  -- Leave dispatched plans untouched. Removing draft plans makes the admin page
  -- regenerate both loops with every accepted demo pickup on its next load.
  delete from public.pickup_route_stops stop
  using public.pickup_route_plans plan
  where stop.route_plan_id = plan.id
    and plan.schedule_id = target_schedule_id
    and plan.status <> 'DISPATCHED';

  delete from public.pickup_route_plans plan
  where plan.schedule_id = target_schedule_id
    and plan.status <> 'DISPATCHED';
end;
$$;
