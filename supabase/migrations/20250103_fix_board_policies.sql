-- Fix RLS policies for board-related tables and complete all missing policies
-- This addresses the "Error fetching board: {}" issue

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "boards_policy" ON boards;
DROP POLICY IF EXISTS "board_columns_policy" ON board_columns;
DROP POLICY IF EXISTS "tasks_policy" ON tasks;
DROP POLICY IF EXISTS "sprints_policy" ON sprints;
DROP POLICY IF EXISTS "sprint_tasks_policy" ON sprint_tasks;
DROP POLICY IF EXISTS "comments_policy" ON comments;
DROP POLICY IF EXISTS "attachments_policy" ON attachments;
DROP POLICY IF EXISTS "time_logs_policy" ON time_logs;
DROP POLICY IF EXISTS "user_notifications_policy" ON user_notifications;
DROP POLICY IF EXISTS "auth_sync_logs_policy" ON auth_sync_logs;

-- Boards: Organization members can access boards for projects in their org
CREATE POLICY "Boards: Org members full access" ON boards FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE p.id = boards.project_id 
    AND om.user_id = auth.uid()
  )
);

-- Board Columns: Organization members can access columns for boards they can access
CREATE POLICY "Board Columns: Org members full access" ON board_columns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM boards b
    JOIN projects p ON b.project_id = p.id
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE b.id = board_columns.board_id 
    AND om.user_id = auth.uid()
  )
);

-- Tasks: Organization members can access tasks for projects in their org
CREATE POLICY "Tasks: Org members full access" ON tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE p.id = tasks.project_id 
    AND om.user_id = auth.uid()
  )
);

-- Sprints: Organization members can access sprints for projects in their org
CREATE POLICY "Sprints: Org members full access" ON sprints FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p 
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE p.id = sprints.project_id 
    AND om.user_id = auth.uid()
  )
);

-- Sprint Tasks: Organization members can access sprint-task relationships
CREATE POLICY "Sprint Tasks: Org members full access" ON sprint_tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sprints s
    JOIN projects p ON s.project_id = p.id
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE s.id = sprint_tasks.sprint_id 
    AND om.user_id = auth.uid()
  )
);

-- Comments: Organization members can access comments on tasks in their org
CREATE POLICY "Comments: Org members full access" ON comments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE t.id = comments.task_id 
    AND om.user_id = auth.uid()
  )
);

-- Attachments: Organization members can access attachments on tasks in their org
CREATE POLICY "Attachments: Org members full access" ON attachments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE t.id = attachments.task_id 
    AND om.user_id = auth.uid()
  )
);

-- Time Logs: Organization members can access time logs on tasks in their org
CREATE POLICY "Time Logs: Org members full access" ON time_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE t.id = time_logs.task_id 
    AND om.user_id = auth.uid()
  )
);

-- User Notifications: Users can only access their own notifications
CREATE POLICY "User Notifications: Own notifications only" ON user_notifications FOR ALL USING (
  user_id = auth.uid()
);

-- Auth Sync Logs: Users can only access their own auth sync logs
CREATE POLICY "Auth Sync Logs: Own logs only" ON auth_sync_logs FOR ALL USING (
  user_id = auth.uid()
);

-- Enable RLS if not already enabled
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sync_logs ENABLE ROW LEVEL SECURITY; 