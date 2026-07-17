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

-- Create citizen and staff users in Supabase Auth first, then assign their auth IDs:
-- update public.profiles set member_code = 'ECO-MM-1048' where email = 'member@example.com';
-- insert into public.center_staff_assignments (center_id, profile_id, role)
-- select '10000000-0000-0000-0000-000000000001', id, 'operator'
-- from public.profiles where email = 'staff@example.com';
