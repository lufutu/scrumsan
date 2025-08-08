-- Performance Optimization: Add missing indexes for foreign keys
-- Run this directly in your database to improve performance

-- Board members table indexes
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_board_user ON board_members(board_id, user_id);

-- Boards table indexes
CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_boards_created_by ON boards(created_by);
CREATE INDEX IF NOT EXISTS idx_boards_org_created ON boards(organization_id, created_at DESC);

-- Organization members table indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON organization_members(organization_id, user_id);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_org_created ON projects(organization_id, created_at DESC);

-- Sprint columns table indexes
CREATE INDEX IF NOT EXISTS idx_sprint_columns_sprint_id ON sprint_columns(sprint_id);

-- Sprints table indexes
CREATE INDEX IF NOT EXISTS idx_sprints_board_id ON sprints(board_id);
CREATE INDEX IF NOT EXISTS idx_sprints_board_status ON sprints(board_id, status);

-- Task assignees table indexes
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_user ON task_assignees(task_id, user_id);

-- Task labels table indexes
CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON task_labels(label_id);

-- Task relations table indexes
CREATE INDEX IF NOT EXISTS idx_task_relations_source_task_id ON task_relations(source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_target_task_id ON task_relations(target_task_id);

-- Task reviewers table indexes
CREATE INDEX IF NOT EXISTS idx_task_reviewers_task_id ON task_reviewers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviewers_user_id ON task_reviewers(user_id);

-- Tasks table indexes (MOST CRITICAL FOR PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_column_id ON tasks(sprint_column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_board_column ON tasks(board_id, column_id) WHERE column_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_board_sprint ON tasks(board_id, sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_board_sprint_column ON tasks(board_id, sprint_column_id) WHERE sprint_column_id IS NOT NULL;

-- Labels table indexes
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON labels(board_id);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_created ON comments(task_id, created_at DESC);

-- Drop unused indexes identified by Supabase linter
DROP INDEX IF EXISTS projects_slug_idx;
DROP INDEX IF EXISTS boards_slug_idx;
DROP INDEX IF EXISTS sprints_slug_idx;