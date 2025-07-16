-- Allow boards to exist without projects (standalone boards)
-- Add organization_id to boards for standalone boards

-- First, add organization_id column to boards table
ALTER TABLE boards ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Make project_id nullable (it's already nullable, but ensuring it's explicit)
ALTER TABLE boards ALTER COLUMN project_id DROP NOT NULL;

-- Update existing boards to have organization_id from their project's organization
UPDATE boards 
SET organization_id = (
  SELECT p.organization_id 
  FROM projects p 
  WHERE p.id = boards.project_id
) 
WHERE project_id IS NOT NULL;

-- Add a check constraint to ensure either project_id or organization_id is set
ALTER TABLE boards ADD CONSTRAINT boards_project_or_org_check 
CHECK (
  (project_id IS NOT NULL AND organization_id IS NULL) OR 
  (project_id IS NULL AND organization_id IS NOT NULL)
); 