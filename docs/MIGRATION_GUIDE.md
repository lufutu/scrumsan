# Database Migration Guide: From Supabase Direct Queries to Prisma APIs

## Overview
This migration addresses the RLS (Row Level Security) errors by converting direct Supabase database queries to use Prisma-based API endpoints. This ensures proper authorization and follows the project's architecture pattern.

## Completed Work

### ✅ API Endpoints Created

1. **Organizations** - `/api/organizations/` (already existed)
   - `GET /api/organizations` - List user's organizations
   - `GET /api/organizations/[id]` - Get organization details
   - `PATCH /api/organizations/[id]` - Update organization
   - `DELETE /api/organizations/[id]` - Delete organization

2. **Projects** - `/api/projects/`
   - `GET /api/projects` - List user's projects
   - `POST /api/projects` - Create project
   - `GET /api/projects/[id]` - Get project details
   - `PATCH /api/projects/[id]` - Update project
   - `DELETE /api/projects/[id]` - Delete project

3. **Project Members** - `/api/projects/[id]/members/`
   - `GET /api/projects/[id]/members` - List project members
   - `POST /api/projects/[id]/members` - Add member
   - `PATCH /api/projects/[id]/members/[userId]` - Update member role
   - `DELETE /api/projects/[id]/members/[userId]` - Remove member

4. **Boards** - `/api/boards/`
   - `POST /api/boards` - Create board (already existed)

5. **Board Columns** - `/api/boards/[boardId]/columns/`
   - `GET /api/boards/[boardId]/columns` - List board columns
   - `POST /api/boards/[boardId]/columns` - Create column
   - `PATCH /api/boards/[boardId]/columns/[columnId]` - Update column
   - `DELETE /api/boards/[boardId]/columns/[columnId]` - Delete column

6. **Tasks** - `/api/tasks/`
   - `GET /api/tasks` - List tasks (with filters)
   - `POST /api/tasks` - Create task
   - `GET /api/tasks/[id]` - Get task details
   - `PATCH /api/tasks/[id]` - Update task
   - `DELETE /api/tasks/[id]` - Delete task

7. **Sprints** - `/api/sprints/`
   - `GET /api/sprints` - List sprints
   - `POST /api/sprints` - Create sprint
   - `GET /api/sprints/[id]` - Get sprint details
   - `PATCH /api/sprints/[id]` - Update sprint
   - `DELETE /api/sprints/[id]` - Delete sprint
   - `POST /api/sprints/[id]/tasks` - Update sprint tasks

### ✅ Updated Components

1. **Board Creation Wizard** - `components/projects/board-creation-wizard-simple.tsx`
   - Fixed the original RLS error by using `/api/boards` endpoint
   - Removed direct Supabase queries

2. **Organizations Page** - `app/(app)/organizations/page.tsx`
   - Fixed undefined `organization_members` error
   - Updated TypeScript interfaces to match API response

3. **Sample Updated Components** (for reference):
   - `components/tasks/task-form-updated.tsx`
   - `components/projects/project-members-updated.tsx`

## Remaining Work

### 🔄 High Priority Components to Update

1. **components/tasks/task-form.tsx**
   - Replace with `task-form-updated.tsx` or update existing
   - Uses `/api/tasks` endpoint

2. **components/projects/project-board.tsx**
   - Update task movement logic to use `/api/tasks/[id]` PATCH
   - Update column management to use `/api/boards/[boardId]/columns`

3. **components/projects/project-members.tsx**
   - Replace with `project-members-updated.tsx` or update existing
   - Uses `/api/projects/[id]/members` endpoints

4. **components/sprints/sprint-form.tsx**
   - Update to use `/api/sprints` endpoints
   - Update sprint-task management to use `/api/sprints/[id]/tasks`

5. **components/sprints/sprint-list.tsx**
   - Update to use `/api/sprints` GET endpoint

### 🔄 Medium Priority Components

6. **components/tasks/task-list.tsx**
   - Update to use `/api/tasks` GET endpoint

7. **components/projects/project-list.tsx**
   - Update to use `/api/projects` GET endpoint

8. **components/boards/standalone-board-view.tsx**
   - Update to use task and column API endpoints

### 🔄 Lower Priority Components

9. **components/dashboard/Dashboard.tsx**
   - Update dashboard queries to use API endpoints

10. **components/vivify/** components**
    - Update vivify-specific components to use API endpoints

## Implementation Steps

### For Each Component:

1. **Remove Supabase imports**:
   ```typescript
   // Remove these
   import { useSupabase } from '@/providers/supabase-provider'
   const { supabase } = useSupabase()
   ```

2. **Replace direct queries with fetch calls**:
   ```typescript
   // Old - Direct Supabase
   const { data, error } = await supabase
     .from('tasks')
     .select('*')
     .eq('project_id', projectId)

   // New - API endpoint
   const response = await fetch(`/api/tasks?projectId=${projectId}`)
   const data = await response.json()
   ```

3. **Update error handling**:
   ```typescript
   // Old
   if (error) throw error

   // New
   if (!response.ok) {
     const error = await response.json()
     throw new Error(error.error || 'Request failed')
   }
   ```

4. **Update TypeScript types**:
   - Remove `Tables<'table_name'>` types
   - Use proper camelCase properties (e.g., `userId` instead of `user_id`)

### Common API Patterns

1. **GET with filters**:
   ```typescript
   const response = await fetch(`/api/tasks?boardId=${boardId}&status=todo`)
   ```

2. **POST for creation**:
   ```typescript
   const response = await fetch('/api/tasks', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(taskData)
   })
   ```

3. **PATCH for updates**:
   ```typescript
   const response = await fetch(`/api/tasks/${taskId}`, {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(updates)
   })
   ```

4. **DELETE for removal**:
   ```typescript
   const response = await fetch(`/api/tasks/${taskId}`, {
     method: 'DELETE'
   })
   ```

## Testing

After updating each component:

1. **Test CRUD operations**:
   - Create, read, update, delete functionality
   - Verify proper authorization (users can only access their data)

2. **Test edge cases**:
   - Invalid IDs
   - Missing permissions
   - Validation errors

3. **Test UI interactions**:
   - Form submissions
   - Real-time updates
   - Error states

## Benefits of This Migration

1. **Eliminates RLS errors** - No more direct Supabase table access
2. **Consistent authorization** - All access checks in one place (API routes)
3. **Better error handling** - Standardized error responses
4. **Type safety** - Proper TypeScript types throughout
5. **Maintainability** - Easier to modify business logic
6. **Performance** - Optimized Prisma queries with proper relations

## Architecture Notes

- **Supabase** is now used only for authentication and file storage
- **Prisma** handles all database operations with proper user filtering
- **API routes** provide consistent business logic and authorization
- **Components** focus on UI logic, not database queries

## Next Steps

1. Start with the highest priority components (task-form, project-board)
2. Update components one by one, testing each thoroughly
3. Replace the old components with updated versions
4. Run the application and test all functionality
5. Remove any unused Supabase query code

This migration will resolve all RLS errors and provide a more robust, maintainable codebase.