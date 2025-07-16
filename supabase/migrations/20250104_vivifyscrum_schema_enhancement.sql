-- VivifyScrum Schema Enhancement Migration
-- Adds all missing features to match VivifyScrum functionality

-- Add missing columns to existing tables
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

ALTER TABLE boards ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'story';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by TEXT[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS logged_hours INTEGER DEFAULT 0;

-- Create task_relations table for task dependencies
CREATE TABLE IF NOT EXISTS task_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL, -- 'blocks', 'duplicates', 'relates_to'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES users(id),
  UNIQUE(source_task_id, target_task_id, relation_type)
);

-- Create worklog entries table
CREATE TABLE IF NOT EXISTS worklog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  hours_logged DECIMAL(4,2) NOT NULL,
  date_logged DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create task_events table for activity tracking
CREATE TABLE IF NOT EXISTS task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'moved', 'assigned', 'commented'
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create sprint_analytics table
CREATE TABLE IF NOT EXISTS sprint_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  remaining_points INTEGER DEFAULT 0,
  completed_points INTEGER DEFAULT 0,
  added_points INTEGER DEFAULT 0,
  removed_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(sprint_id, date)
);

-- Create board_templates table
CREATE TABLE IF NOT EXISTS board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  board_type VARCHAR(50) NOT NULL,
  columns JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies for new tables
ALTER TABLE task_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_relations
CREATE POLICY "task_relations_access" ON task_relations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN organization_members om ON p.organization_id = om.organization_id
    WHERE (t.id = task_relations.source_task_id OR t.id = task_relations.target_task_id)
    AND om.user_id = auth.uid()
  )
);

-- RLS Policies for worklog_entries
CREATE POLICY "worklog_entries_access" ON worklog_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN organization_members om ON p.organization_id = om.organization_id
    WHERE t.id = worklog_entries.task_id
    AND om.user_id = auth.uid()
  )
);

-- RLS Policies for task_events
CREATE POLICY "task_events_access" ON task_events FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN organization_members om ON p.organization_id = om.organization_id
    WHERE t.id = task_events.task_id
    AND om.user_id = auth.uid()
  )
);

-- RLS Policies for team_invitations
CREATE POLICY "team_invitations_access" ON team_invitations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = team_invitations.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- RLS Policies for documents
CREATE POLICY "documents_access" ON documents FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = documents.organization_id
    AND om.user_id = auth.uid()
  )
);

-- RLS Policies for sprint_analytics
CREATE POLICY "sprint_analytics_access" ON sprint_analytics FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sprints s
    LEFT JOIN projects p ON s.project_id = p.id
    LEFT JOIN organization_members om ON p.organization_id = om.organization_id
    WHERE s.id = sprint_analytics.sprint_id
    AND om.user_id = auth.uid()
  )
);

-- RLS Policies for board_templates
CREATE POLICY "board_templates_access" ON board_templates FOR ALL USING (
  created_by = auth.uid() OR is_default = true
);

-- Insert default board templates
INSERT INTO board_templates (name, description, board_type, columns, is_default) VALUES 
('Scrum Board', 'Standard Scrum board with Product Backlog, Sprint, and workflow columns', 'scrum', 
 '[{"name": "Product Backlog", "position": 0}, {"name": "Sprint Backlog", "position": 1}, {"name": "In Progress", "position": 2}, {"name": "Testing", "position": 3}, {"name": "Done", "position": 4}]', true),
('Kanban Board', 'Simple Kanban board with To Do, In Progress, and Done columns', 'kanban',
 '[{"name": "To Do", "position": 0}, {"name": "In Progress", "position": 1}, {"name": "Done", "position": 2}]', true),
('Software Development', 'Extended Scrum board for software development teams', 'scrum',
 '[{"name": "Backlog", "position": 0}, {"name": "Selected for Development", "position": 1}, {"name": "In Progress", "position": 2}, {"name": "Code Review", "position": 3}, {"name": "Testing", "position": 4}, {"name": "Done", "position": 5}]', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_relations_source ON task_relations(source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_target ON task_relations(target_task_id);
CREATE INDEX IF NOT EXISTS idx_worklog_entries_task ON worklog_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_worklog_entries_user_date ON worklog_entries(user_id, date_logged);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_sprint_analytics_sprint_date ON sprint_analytics(sprint_id, date);

-- Update existing tasks to have task_type
UPDATE tasks SET task_type = 'story' WHERE task_type IS NULL;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_worklog_entries_updated_at BEFORE UPDATE ON worklog_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 