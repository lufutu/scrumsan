-- Sync existing auth users with public users table
insert into public.users (id, full_name, avatar_url)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', au.email),
  au.raw_user_meta_data->>'avatar_url'
from auth.users au
where not exists (
  select 1 from public.users pu where pu.id = au.id
); 