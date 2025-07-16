-- Add board_type support for Kanban vs Scrum boards
-- This enables VivifyScrum-like board type selection

-- Add board_type column to boards table
ALTER TABLE boards ADD COLUMN board_type text DEFAULT 'kanban' CHECK (board_type IN ('kanban', 'scrum'));

-- Update existing boards to be 'kanban' type (they're currently kanban-style)
UPDATE boards SET board_type = 'kanban' WHERE board_type IS NULL; 