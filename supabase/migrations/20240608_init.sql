-- ScrumSan Agile Project Management - Initial Schema Migration

-- USERS (profile extension, Supabase Auth manages core users)
create table if not exists users (
  id uuid primary key references auth.users(id),
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- ORGANIZATIONS
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid references users(id),
  created_at timestamp with time zone default now()
);

-- ORGANIZATION MEMBERS
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null, -- 'owner', 'admin', 'member'
  created_at timestamp with time zone default now(),
  unique (organization_id, user_id)
);

-- PROJECTS
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references users(id),
  created_at timestamp with time zone default now()
);

-- PROJECT MEMBERS
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null, -- 'owner', 'admin', 'member'
  created_at timestamp with time zone default now(),
  unique (project_id, user_id)
);

-- BOARDS
create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- BOARD COLUMNS
create table if not exists board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  name text not null,
  position int not null,
  created_at timestamp with time zone default now()
);

-- TASKS
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade,
  column_id uuid references board_columns(id) on delete set null,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text,
  assignee_id uuid references users(id),
  created_by uuid references users(id),
  due_date date,
  created_at timestamp with time zone default now()
);

-- SPRINTS
create table if not exists sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  goal text,
  start_date date,
  end_date date,
  created_at timestamp with time zone default now()
);

-- SPRINT TASKS
create table if not exists sprint_tasks (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid references sprints(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  unique (sprint_id, task_id)
);

-- COMMENTS
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references users(id),
  content text not null,
  created_at timestamp with time zone default now()
);

-- ATTACHMENTS
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  url text not null,
  name text,
  uploaded_by uuid references users(id),
  created_at timestamp with time zone default now()
);

-- TIME LOGS
create table if not exists time_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references users(id),
  minutes int not null,
  created_at timestamp with time zone default now()
);

-- NOTIFICATIONS
create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  message text,
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS for all tables
alter table users enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table boards enable row level security;
alter table board_columns enable row level security;
alter table tasks enable row level security;
alter table sprints enable row level security;
alter table sprint_tasks enable row level security;
alter table comments enable row level security;
alter table attachments enable row level security;
alter table time_logs enable row level security;
alter table user_notifications enable row level security;

-- RLS Policies (examples, adjust as needed)

-- Users: Only the user can select/update their own profile
create policy "Users: Self access" on users
  for select using (auth.uid() = id);

create policy "Users: Self update" on users
  for update using (auth.uid() = id);

-- Organizations: Members can select, owner can update/delete
create policy "Organizations: Members can view" on organizations
  for select using (
    exists (
      select 1 from organization_members
      where organization_members.organization_id = id
      and organization_members.user_id = auth.uid()
    )
  );

create policy "Organizations: Owner can update" on organizations
  for update using (owner_id = auth.uid());

create policy "Organizations: Owner can delete" on organizations
  for delete using (owner_id = auth.uid());

-- Organization Members: Only members can select, only owner/admin can update/delete
create policy "Org Members: Members can view" on organization_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from organization_members om2
      where om2.organization_id = organization_members.organization_id
      and om2.user_id = auth.uid()
    )
  );

create policy "Org Members: Owner/Admin can update" on organization_members
  for update using (
    exists (
      select 1 from organization_members om2
      where om2.organization_id = organization_members.organization_id
      and om2.user_id = auth.uid()
      and om2.role in ('owner', 'admin')
    )
  );

create policy "Org Members: Owner/Admin can delete" on organization_members
  for delete using (
    exists (
      select 1 from organization_members om2
      where om2.organization_id = organization_members.organization_id
      and om2.user_id = auth.uid()
      and om2.role in ('owner', 'admin')
    )
  );

-- Projects: Project members can select, owner/admin can update/delete
create policy "Projects: Members can view" on projects
  for select using (
    exists (
      select 1 from project_members
      where project_members.project_id = id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Projects: Owner/Admin can update" on projects
  for update using (
    exists (
      select 1 from project_members
      where project_members.project_id = id
      and project_members.user_id = auth.uid()
      and project_members.role in ('owner', 'admin')
    )
  );

create policy "Projects: Owner/Admin can delete" on projects
  for delete using (
    exists (
      select 1 from project_members
      where project_members.project_id = id
      and project_members.user_id = auth.uid()
      and project_members.role in ('owner', 'admin')
    )
  );

-- Project Members: Only project members can select, owner/admin can update/delete
create policy "Project Members: Members can view" on project_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
    )
  );

create policy "Project Members: Owner/Admin can update" on project_members
  for update using (
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
      and pm2.role in ('owner', 'admin')
    )
  );

create policy "Project Members: Owner/Admin can delete" on project_members
  for delete using (
    exists (
      select 1 from project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
      and pm2.role in ('owner', 'admin')
    )
  );

-- Tasks: Project members can select, assignee/creator can update, owner/admin can delete
create policy "Tasks: Project members can view" on tasks
  for select using (
    exists (
      select 1 from project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Tasks: Assignee/Creator can update" on tasks
  for update using (
    assignee_id = auth.uid() or created_by = auth.uid()
  );

create policy "Tasks: Owner/Admin can delete" on tasks
  for delete using (
    exists (
      select 1 from project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
      and project_members.role in ('owner', 'admin')
    )
  );

-- (Repeat similar policies for sprints, comments, attachments, etc.)
-- You can add more granular policies as needed for your app's needs. 