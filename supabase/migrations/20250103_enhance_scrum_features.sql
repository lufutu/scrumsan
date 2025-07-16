-- Add essential fields for complete Scrum functionality

-- Add story points and priority to tasks
ALTER TABLE tasks ADD COLUMN story_points integer DEFAULT 0;
ALTER TABLE tasks ADD COLUMN priority varchar(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE tasks ADD COLUMN labels text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN position integer DEFAULT 0;

-- Add sprint status and planning fields
ALTER TABLE sprints ADD COLUMN status varchar(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed'));
ALTER TABLE sprints ADD COLUMN duration_days integer DEFAULT 14;
ALTER TABLE sprints ADD COLUMN planned_points integer DEFAULT 0;
ALTER TABLE sprints ADD COLUMN completed_points integer DEFAULT 0;

-- Add board-level settings for Scrum
ALTER TABLE boards ADD COLUMN settings jsonb DEFAULT '{}';

-- Create task_labels table for better label management
CREATE TABLE IF NOT EXISTS task_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#3B82F6',
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(name, board_id)
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  completed boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies for new tables
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_labels
CREATE POLICY "Users can view labels for boards they have access to" ON task_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON (p.organization_id = om.organization_id OR b.organization_id = om.organization_id)
      WHERE b.id = task_labels.board_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can insert labels for boards they have access to" ON task_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON (p.organization_id = om.organization_id OR b.organization_id = om.organization_id)
      WHERE b.id = task_labels.board_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update labels for boards they have access to" ON task_labels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON (p.organization_id = om.organization_id OR b.organization_id = om.organization_id)
      WHERE b.id = task_labels.board_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete labels for boards they have access to" ON task_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON (p.organization_id = om.organization_id OR b.organization_id = om.organization_id)
      WHERE b.id = task_labels.board_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- RLS policies for subtasks
CREATE POLICY "Users can view subtasks for tasks they have access to" ON subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE t.id = subtasks.task_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can insert subtasks for tasks they have access to" ON subtasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE t.id = subtasks.task_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update subtasks for tasks they have access to" ON subtasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE t.id = subtasks.task_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete subtasks for tasks they have access to" ON subtasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE t.id = subtasks.task_id 
      AND (pm.user_id = auth.uid() OR om.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  ); 