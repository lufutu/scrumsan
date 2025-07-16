-- Fix RLS policies to support both project boards and standalone boards
-- This resolves the "new row violates row-level security policy" error

-- Drop the existing boards policy that only handles project boards
DROP POLICY IF EXISTS "Boards: Org members full access" ON boards;

-- Create updated policy that handles both project boards and standalone boards
CREATE POLICY "Boards: Org members full access" ON boards FOR ALL USING (
  -- For project boards: check if user is member of the project's organization
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM projects p 
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE p.id = boards.project_id 
    AND om.user_id = auth.uid()
  ))
  OR
  -- For standalone boards: check if user is member of the board's organization
  (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = boards.organization_id
    AND om.user_id = auth.uid()
  ))
);

-- Also need to update the board_columns policy to handle standalone boards
DROP POLICY IF EXISTS "Board Columns: Org members full access" ON board_columns;

CREATE POLICY "Board Columns: Org members full access" ON board_columns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM boards b
    LEFT JOIN projects p ON b.project_id = p.id
    JOIN organization_members om ON (
      (b.project_id IS NOT NULL AND p.organization_id = om.organization_id) OR
      (b.organization_id IS NOT NULL AND b.organization_id = om.organization_id)
    )
    WHERE b.id = board_columns.board_id 
    AND om.user_id = auth.uid()
  )
);

-- Update tasks policy to handle tasks on standalone boards
DROP POLICY IF EXISTS "Tasks: Org members full access" ON tasks;

CREATE POLICY "Tasks: Org members full access" ON tasks FOR ALL USING (
  -- For project tasks: check project membership
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM projects p 
    JOIN organization_members om ON p.organization_id = om.organization_id 
    WHERE p.id = tasks.project_id 
    AND om.user_id = auth.uid()
  ))
  OR
  -- For standalone board tasks: check board organization membership via board_id
  (project_id IS NULL AND board_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM boards b
    JOIN organization_members om ON b.organization_id = om.organization_id
    WHERE b.id = tasks.board_id
    AND om.user_id = auth.uid()
  ))
); 