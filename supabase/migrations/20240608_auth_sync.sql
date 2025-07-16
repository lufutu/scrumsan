-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create a table for auth sync logs
create table if not exists public.auth_sync_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid not null,
  error_message text,
  created_at timestamp with time zone default now()
);

-- Function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Check if user already exists
  if exists (select 1 from public.users where id = new.id) then
    insert into public.auth_sync_logs (event_type, user_id, error_message)
    values ('user_created', new.id, 'User already exists in public.users');
    return new;
  end if;

  -- Insert new user
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Log success
  insert into public.auth_sync_logs (event_type, user_id)
  values ('user_created', new.id);

  return new;
exception
  when others then
    -- Log error
    insert into public.auth_sync_logs (event_type, user_id, error_message)
    values ('user_created', new.id, SQLERRM);
    return new;
end;
$$ language plpgsql security definer;

-- Function to handle user updates
create or replace function public.handle_user_update()
returns trigger as $$
begin
  -- Check if user exists
  if not exists (select 1 from public.users where id = new.id) then
    -- Create user if they don't exist
    insert into public.users (id, full_name, avatar_url)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      new.raw_user_meta_data->>'avatar_url'
    );

    -- Log creation
    insert into public.auth_sync_logs (event_type, user_id)
    values ('user_updated_created', new.id);
  else
    -- Update existing user
    update public.users
    set
      full_name = coalesce(new.raw_user_meta_data->>'full_name', full_name),
      avatar_url = coalesce(new.raw_user_meta_data->>'avatar_url', avatar_url)
    where id = new.id;

    -- Log update
    insert into public.auth_sync_logs (event_type, user_id)
    values ('user_updated', new.id);
  end if;

  return new;
exception
  when others then
    -- Log error
    insert into public.auth_sync_logs (event_type, user_id, error_message)
    values ('user_updated', new.id, SQLERRM);
    return new;
end;
$$ language plpgsql security definer;

-- Function to handle user deletion
create or replace function public.handle_user_deletion()
returns trigger as $$
begin
  -- Check if user exists before deletion
  if exists (select 1 from public.users where id = old.id) then
    delete from public.users where id = old.id;
    
    -- Log success
    insert into public.auth_sync_logs (event_type, user_id)
    values ('user_deleted', old.id);
  else
    -- Log warning
    insert into public.auth_sync_logs (event_type, user_id, error_message)
    values ('user_deleted', old.id, 'User not found in public.users');
  end if;

  return old;
exception
  when others then
    -- Log error
    insert into public.auth_sync_logs (event_type, user_id, error_message)
    values ('user_deleted', old.id, SQLERRM);
    return old;
end;
$$ language plpgsql security definer;

-- Drop existing triggers if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;
drop trigger if exists on_auth_user_deleted on auth.users;

-- Create triggers
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute procedure public.handle_user_deletion();

-- Add RLS policy for auth_sync_logs
alter table public.auth_sync_logs enable row level security;

create policy "Auth sync logs are viewable by admins only"
  on public.auth_sync_logs
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and exists (
        select 1 from public.organization_members
        where user_id = auth.uid()
        and role in ('owner', 'admin')
      )
    )
  ); 