insert into public.recycling_centers (
  id, slug, name, township, address, latitude, longitude, opening_hours, accepted_materials
) values
  ('10000000-0000-0000-0000-000000000001', 'hlaing-ecopoint', 'Hlaing EcoPoint', 'Hlaing Township', 'Insein Road near Hledan', 16.843600, 96.130500, '8:30 AM-6:00 PM', array['pet-plastic','rigid-plastic','paper','cardboard','glass','aluminium','steel']),
  ('10000000-0000-0000-0000-000000000002', 'insein-green-hub', 'Insein Green Hub', 'Insein Township', 'Lower Mingaladon Road', 16.889800, 96.109800, '9:00 AM-5:30 PM', array['pet-plastic','rigid-plastic','paper','cardboard','glass']),
  ('10000000-0000-0000-0000-000000000003', 'lanmadaw-material-bank', 'Lanmadaw Material Bank', 'Lanmadaw Township', 'Maha Bandula Road', 16.777000, 96.140100, '8:00 AM-5:00 PM', array['pet-plastic','paper','cardboard','glass','aluminium']),
  ('10000000-0000-0000-0000-000000000004', 'tamwe-community-dropoff', 'Tamwe Community Drop-off', 'Tamwe Township', 'U Chit Maung Road', 16.810300, 96.176100, '9:00 AM-6:00 PM', array['pet-plastic','paper','aluminium','steel']),
  ('10000000-0000-0000-0000-000000000005', 'yankin-circular-center', 'Yankin Circular Center', 'Yankin Township', 'Saya San Road', 16.827300, 96.173700, '8:30 AM-5:30 PM', array['pet-plastic','paper','cardboard','e-waste','batteries'])
on conflict (id) do update set
  name = excluded.name,
  accepted_materials = excluded.accepted_materials,
  updated_at = now();

insert into public.partner_reward_offers (
  id, center_id, title, description, township, points_cost, stock
) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Reusable market tote', 'A sturdy washable bag for groceries and everyday errands.', 'Hlaing Township', 150, 24),
  ('20000000-0000-0000-0000-000000000002', null, 'Kitchen herb seedling', 'One seasonal herb prepared for a balcony or windowsill.', 'Kamayut Township', 250, 18),
  ('20000000-0000-0000-0000-000000000003', null, '15% refill discount', 'Use one voucher on household refill products brought in your own container.', 'Sanchaung Township', 350, 60),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Home sorting starter kit', 'Reusable labels and fold-flat bags for separating dry recyclables.', 'Hlaing Township', 500, 8)
on conflict (id) do update set
  title = excluded.title,
  stock = excluded.stock,
  updated_at = now();

-- Sign in through Supabase Auth first so ensure_current_profile creates each profile.
-- Then assign the Supabase user IDs to the intended center with the statements below:
-- update public.profiles set member_code = 'ECO-MM-1048' where email = 'member@example.com';
-- insert into public.center_staff_assignments (center_id, profile_id, role)
-- select '10000000-0000-0000-0000-000000000001', id, 'operator'
-- from public.profiles where email = 'staff@example.com';

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '30000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'member@example.com',
    crypt('ecolink-demo-123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mya Thiri"}'::jsonb,
    now(),
    now()
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'staff@example.com',
    crypt('ecolink-demo-123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Hlaing Operator"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'member@example.com',
    '{"sub":"30000000-0000-0000-0000-000000000001","email":"member@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'staff@example.com',
    '{"sub":"30000000-0000-0000-0000-000000000002","email":"staff@example.com"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider, provider_id) do update set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (
  id, auth_user_id, display_name, email, member_code, preferred_language, created_at, updated_at
) values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Mya Thiri',
    'member@example.com',
    'ECO-MM-1048',
    'en',
    now(),
    now()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'Hlaing Operator',
    'staff@example.com',
    'ECO-MM-STAFF',
    'en',
    now(),
    now()
  )
on conflict (id) do update set
  auth_user_id = excluded.auth_user_id,
  display_name = excluded.display_name,
  email = excluded.email,
  member_code = excluded.member_code,
  updated_at = now();

insert into public.center_staff_assignments (id, center_id, profile_id, role, is_active)
values (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  'operator',
  true
)
on conflict (center_id, profile_id) do update set
  role = excluded.role,
  is_active = excluded.is_active;

insert into public.verified_drop_offs (
  id, center_id, member_profile_id, recorded_by_profile_id,
  material_slug, weight_kg, points_awarded, recorded_at
) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'pet-plastic', 3.0, 150, '2026-07-14T09:30:00+06:30'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'paper', 6.0, 120, '2026-07-09T10:15:00+06:30'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'pet-plastic', 5.0, 250, '2026-06-28T08:45:00+06:30'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'e-waste', 2.0, 160, '2026-06-18T12:00:00+06:30')
on conflict (id) do update set
  weight_kg = excluded.weight_kg,
  points_awarded = excluded.points_awarded,
  recorded_at = excluded.recorded_at;

insert into public.point_ledger_entries (
  id, profile_id, center_id, drop_off_id, points, entry_type, description, created_at
) values
  ('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 150, 'earned', 'Verified PET plastic recycling drop-off', '2026-07-14T09:30:00+06:30'),
  ('70000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 120, 'earned', 'Verified paper recycling drop-off', '2026-07-09T10:15:00+06:30'),
  ('70000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 250, 'earned', 'Verified PET plastic recycling drop-off', '2026-06-28T08:45:00+06:30'),
  ('70000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000004', 160, 'earned', 'Verified e-waste recycling drop-off', '2026-06-18T12:00:00+06:30')
on conflict (id) do update set
  points = excluded.points,
  description = excluded.description,
  created_at = excluded.created_at;
