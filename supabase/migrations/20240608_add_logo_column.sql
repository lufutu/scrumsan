-- Add logo column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo text; 