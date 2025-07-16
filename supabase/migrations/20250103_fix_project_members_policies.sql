-- Fix project_members RLS policies to prevent infinite recursion
-- and add missing INSERT policy

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Project Members: Members can view" ON project_members;
DROP POLICY IF EXISTS "Project Members: Owner/Admin can update" ON project_members;
DROP POLICY IF EXISTS "Project Members: Owner/Admin can delete" ON project_members;

-- Create fixed policies

-- INSERT: Allow users to be added as project members by project owners/admins
-- Also allow organization members to add themselves to projects in their org
CREATE POLICY "Project Members: Can insert" ON project_members
  FOR INSERT WITH CHECK (
    -- Allow project creator to add themselves when creating the project
    auth.uid() IN (
      SELECT created_by FROM projects WHERE id = project_id
    )
    OR
    -- Allow existing project admins/owners to add new members
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
    OR
    -- Allow organization members to add themselves to organization projects
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE p.id = project_members.project_id
      AND om.user_id = auth.uid()
      AND project_members.user_id = auth.uid()
    )
  );

-- SELECT: Users can view project members if they have access to the project
-- Fix the infinite recursion by using organization membership as base access
CREATE POLICY "Project Members: Can view" ON project_members
  FOR SELECT USING (
    -- Users can see their own membership
    user_id = auth.uid()
    OR
    -- Users can see members of projects they belong to
    project_id IN (
      SELECT pm.project_id 
      FROM project_members pm 
      WHERE pm.user_id = auth.uid()
    )
    OR
    -- Organization members can see project members for projects in their org
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- UPDATE: Only project owners/admins can update member roles
CREATE POLICY "Project Members: Owner/Admin can update" ON project_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- DELETE: Only project owners/admins can remove members
CREATE POLICY "Project Members: Owner/Admin can delete" ON project_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- Also fix the projects policies to ensure they work correctly
DROP POLICY IF EXISTS "Projects: Members can view" ON projects;
DROP POLICY IF EXISTS "Projects: Owner/Admin can update" ON projects;
DROP POLICY IF EXISTS "Projects: Owner/Admin can delete" ON projects;

-- CREATE: Allow organization members to create projects
CREATE POLICY "Projects: Org members can create" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = projects.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- SELECT: Allow organization members to view projects in their organization
CREATE POLICY "Projects: Org members can view" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = projects.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- UPDATE: Only project owners/admins can update projects
CREATE POLICY "Projects: Owner/Admin can update" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- DELETE: Only project owners/admins can delete projects
CREATE POLICY "Projects: Owner/Admin can delete" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  ); 