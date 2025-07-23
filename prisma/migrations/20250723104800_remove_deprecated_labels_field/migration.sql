-- Remove deprecated labels column from tasks table
-- This field has been replaced with the task_labels junction table

-- Drop the labels column (this will remove any remaining data in this column)
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "labels";