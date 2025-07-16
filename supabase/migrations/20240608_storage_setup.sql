-- Storage setup for ScrumSan

-- Create storage bucket for organizations (PRIVATE for security)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizations', 'organizations', false)
ON CONFLICT (id) DO NOTHING;

-- Update existing bucket to be private if it exists
UPDATE storage.buckets 
SET public = false 
WHERE id = 'organizations';

-- Create RLS policies for organizations bucket
CREATE POLICY "Organization members can view logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'organizations' AND
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND (storage.foldername(name))[1] = o.id::text
  )
);

CREATE POLICY "Organization owners can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'organizations' AND
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND (storage.foldername(name))[1] = o.id::text
  )
);

CREATE POLICY "Organization owners can update logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'organizations' AND
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND (storage.foldername(name))[1] = o.id::text
  )
);

CREATE POLICY "Organization owners can delete logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'organizations' AND
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND (storage.foldername(name))[1] = o.id::text
  )
);

-- Remove any existing public access policy (bucket is now private)
DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects; 