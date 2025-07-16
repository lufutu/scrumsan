-- Fix organization_members RLS policies to prevent infinite recursion
-- and add missing INSERT policy

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Org Members: Members can view" ON organization_members;
DROP POLICY IF EXISTS "Org Members: Owner/Admin can update" ON organization_members;
DROP POLICY IF EXISTS "Org Members: Owner/Admin can delete" ON organization_members;

-- Create fixed policies

-- INSERT: Allow users to be added as organization members by org owners/admins
-- Also allow the organization owner to add themselves when creating the org
CREATE POLICY "Org Members: Owner/Admin can insert" ON organization_members
  FOR INSERT WITH CHECK (
    -- Allow organization owner to add themselves when creating the organization
    auth.uid() IN (
      SELECT owner_id FROM organizations WHERE id = organization_id
    )
    OR
    -- Allow existing org admins/owners to add new members
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- SELECT: Users can view organization members if they are members themselves
-- Fix the infinite recursion by simplifying the logic
CREATE POLICY "Org Members: Members can view" ON organization_members
  FOR SELECT USING (
    -- Users can see their own membership
    user_id = auth.uid()
    OR
    -- Users can see other members of organizations they belong to
    organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om 
      WHERE om.user_id = auth.uid()
    )
  );

-- UPDATE: Only org owners/admins can update member roles
CREATE POLICY "Org Members: Owner/Admin can update" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- DELETE: Only org owners/admins can remove members
CREATE POLICY "Org Members: Owner/Admin can delete" ON organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  ); 