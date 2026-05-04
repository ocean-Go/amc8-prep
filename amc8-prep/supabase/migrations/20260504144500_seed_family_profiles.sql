-- Family MVP uses stable local profile ids for Matt and Chris.
-- The app does not currently use Supabase Auth sessions, so profiles must be seedable directly.

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

insert into public.profiles (id, username, full_name)
values
  ('00000000-0000-0000-0000-000000000001', 'matt', 'Matt'),
  ('00000000-0000-0000-0000-000000000002', 'chris', 'Chris')
on conflict (id) do update
set
  username = excluded.username,
  full_name = excluded.full_name;
