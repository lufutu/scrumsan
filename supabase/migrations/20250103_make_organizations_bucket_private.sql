-- Make organizations storage bucket private for security
-- This ensures all logo access goes through signed URLs only

-- Update the organizations bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'organizations';

-- Remove the public access policy that allows unrestricted access
DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects; 