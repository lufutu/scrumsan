-- Performance optimization indexes for team management
-- Run this migration to improve query performance

-- Index for organization member lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_members_permission_set_id ON organization_members(permission_set_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_working_hours ON organization_members(working_hours_per_week);
CREATE INDEX IF NOT EXISTS idx_organization_members_join_date ON organization_members(join_date);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_organization_members_org_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_created ON organization_members(organization_id, created_at);

-- Index for user searches
CREATE INDEX IF NOT EXISTS idx_users_full_name_gin ON users USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_users_email_gin ON users USING gin(to_tsvector('english', email));

-- Index for job title searches
CREATE INDEX IF NOT EXISTS idx_organization_members_job_title_gin ON organization_members USING gin(to_tsvector('english', job_title));

-- Indexes for project engagements
CREATE INDEX IF NOT EXISTS idx_project_engagements_member_id ON project_engagements(organization_member_id);
CREATE INDEX IF NOT EXISTS idx_project_engagements_project_id ON project_engagements(project_id);
CREATE INDEX IF NOT EXISTS idx_project_engagements_active ON project_engagements(is_active);
CREATE INDEX IF NOT EXISTS idx_project_engagements_dates ON project_engagements(start_date, end_date);

-- Composite index for active engagements
CREATE INDEX IF NOT EXISTS idx_project_engagements_member_active ON project_engagements(organization_member_id, is_active);

-- Indexes for time off entries
CREATE INDEX IF NOT EXISTS idx_time_off_entries_member_id ON time_off_entries(organization_member_id);
CREATE INDEX IF NOT EXISTS idx_time_off_entries_status ON time_off_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_off_entries_dates ON time_off_entries(start_date, end_date);

-- Composite index for active time off
CREATE INDEX IF NOT EXISTS idx_time_off_entries_member_status_dates ON time_off_entries(organization_member_id, status, start_date, end_date);

-- Indexes for permission sets
CREATE INDEX IF NOT EXISTS idx_permission_sets_org_id ON permission_sets(organization_id);
CREATE INDEX IF NOT EXISTS idx_permission_sets_name ON permission_sets(name);
CREATE INDEX IF NOT EXISTS idx_permission_sets_default ON permission_sets(is_default);

-- Indexes for member profiles
CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON member_profiles(organization_member_id);

-- Indexes for timeline events
CREATE INDEX IF NOT EXISTS idx_timeline_events_member_id ON timeline_events(organization_member_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date);

-- Indexes for custom roles
CREATE INDEX IF NOT EXISTS idx_custom_roles_org_id ON custom_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_roles(name);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_organization_members_active_engagements 
ON organization_members(id) 
WHERE EXISTS (
  SELECT 1 FROM project_engagements 
  WHERE project_engagements.organization_member_id = organization_members.id 
  AND project_engagements.is_active = true
);

CREATE INDEX IF NOT EXISTS idx_organization_members_current_time_off 
ON organization_members(id) 
WHERE EXISTS (
  SELECT 1 FROM time_off_entries 
  WHERE time_off_entries.organization_member_id = organization_members.id 
  AND time_off_entries.status = 'approved'
  AND time_off_entries.start_date <= CURRENT_DATE
  AND time_off_entries.end_date >= CURRENT_DATE
);

-- Statistics update for better query planning
ANALYZE organization_members;
ANALYZE project_engagements;
ANALYZE time_off_entries;
ANALYZE permission_sets;
ANALYZE member_profiles;
ANALYZE timeline_events;
ANALYZE custom_roles;