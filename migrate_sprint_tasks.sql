-- Migration script to add sprint_id to tasks and migrate data from sprint_tasks

-- 1. Add sprint_id column to tasks table
ALTER TABLE tasks ADD COLUMN sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

-- 2. Migrate data from sprint_tasks to tasks.sprint_id
UPDATE tasks 
SET sprint_id = st.sprint_id 
FROM sprint_tasks st 
WHERE tasks.id = st.task_id;

-- 3. Add index for performance
CREATE INDEX idx_tasks_sprint_id ON tasks(sprint_id);

-- 4. Drop sprint_tasks table (commented out for safety, run manually after verification)
-- DROP TABLE sprint_tasks;