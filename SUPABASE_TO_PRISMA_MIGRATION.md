# Supabase to Prisma Migration Guide

## Overview

This document outlines the systematic migration from direct Supabase database queries to Prisma ORM API calls throughout the codebase.

## Migration Status

### ✅ Completed
- ✅ Board access API route created (`/api/boards/[boardId]`)
- ✅ Standalone board view updated to support scrum boards
- ✅ Custom hooks created for API calls (`useBoards`, `useTasks`, `useProjects`)
- ✅ Scrum board project requirement removed

### 🔄 In Progress
- 🔄 Component migration to use new hooks
- 🔄 API routes cleanup

### ❌ Pending
- ❌ Complete component migration
- ❌ Remove Supabase providers from components
- ❌ Update all form submissions to use API routes

## Files That Need Migration

### High Priority Components (Direct Supabase Usage)
1. **components/projects/project-board.tsx** - Main project board component
2. **components/projects/project-scrum-board.tsx** - Scrum board functionality  
3. **components/tasks/task-form.tsx** - Task creation/editing
4. **components/tasks/task-list.tsx** - Task listing
5. **components/projects/project-form.tsx** - Project creation/editing
6. **components/dashboard/Dashboard.tsx** - Main dashboard
7. **components/projects/project-members.tsx** - Project member management

### Medium Priority Components
8. **components/sprints/sprint-form.tsx** - Sprint management
9. **components/sprints/sprint-list.tsx** - Sprint listing
10. **components/sprints/sprint-details.tsx** - Sprint details
11. **components/vivify/** - VivifyScrum-style components
12. **components/projects/project-analytics.tsx** - Analytics
13. **components/organizations/*** - Organization management

### Low Priority Components
14. **hooks/use-*.ts** - Custom hooks using Supabase
15. **providers/notifications-provider.tsx** - Notification system
16. **providers/realtime-provider.tsx** - Real-time updates

## Migration Pattern

### Before (Supabase)
```typescript
const { supabase } = useSupabase()

const fetchData = async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('column', value)
    
  if (error) throw error
  return data
}
```

### After (Prisma API)
```typescript
import { useBoards } from '@/hooks/useBoards' // or relevant hook

const { boards, isLoading, error, mutate } = useBoards(organizationId, projectId)

// For mutations:
const createBoard = async (data) => {
  const response = await fetch('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) throw new Error('Failed')
  await mutate() // Refresh data
}
```

## Custom Hooks Available

### useBoards
- `useBoards(organizationId?, projectId?, standalone?)` - List boards
- `useBoard(boardId)` - Single board with columns and tasks
- `createBoard(data)` - Create new board

### useTasks  
- `useTasks(projectId?, boardId?, organizationId?)` - List tasks
- `createTask(data)` - Create new task
- `updateTask(id, data)` - Update task
- `deleteTask(id)` - Delete task

### useProjects
- `useProjects(organizationId?)` - List projects
- `useProject(projectId)` - Single project with details
- `createProject(data)` - Create new project
- `updateProject(id, data)` - Update project
- `deleteProject(id)` - Delete project

### useOrganizations (Already exists)
- Organization management functionality

## API Routes Available

### Boards
- `GET /api/boards` - List boards (supports organizationId, projectId, standalone filters)
- `POST /api/boards` - Create board
- `GET /api/boards/[boardId]` - Get board with columns and tasks
- `PATCH /api/boards/[boardId]` - Update board
- `DELETE /api/boards/[boardId]` - Delete board

### Tasks
- `GET /api/tasks` - List tasks (supports filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/[taskId]` - Get task details
- `PATCH /api/tasks/[taskId]` - Update task
- `DELETE /api/tasks/[taskId]` - Delete task

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[projectId]` - Get project details
- `PATCH /api/projects/[projectId]` - Update project
- `DELETE /api/projects/[projectId]` - Delete project

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details
- `PATCH /api/organizations/[id]` - Update organization
- `DELETE /api/organizations/[id]` - Delete organization

## Migration Steps for Each Component

1. **Replace Supabase imports** with custom hooks
2. **Remove useSupabase calls** and direct supabase queries
3. **Use SWR-based hooks** for data fetching
4. **Replace mutations** with API fetch calls
5. **Update error handling** to work with fetch responses
6. **Test functionality** thoroughly

## Data Structure Changes

### Old (Supabase Tables)
```typescript
// Uses snake_case and Tables type
Tables<'boards'> & {
  board_columns: Array<Tables<'board_columns'>>
}
```

### New (Prisma API)
```typescript
// Uses camelCase and custom interfaces
interface Board {
  id: string
  name: string
  boardType: string | null
  columns?: Array<BoardColumn>
}
```

## Testing Strategy

1. **Component Level**: Test each migrated component individually
2. **Integration**: Test data flow between components
3. **End-to-End**: Test complete user workflows
4. **Performance**: Ensure SWR caching works properly

## Rollback Plan

If issues arise:
1. Keep original Supabase code in comments temporarily
2. Use feature flags to switch between implementations
3. Monitor error rates and performance
4. Have database backups ready

## Notes

- **Real-time features** may need special consideration (Supabase real-time vs custom implementation)
- **File upload** should continue using Supabase Storage (only database queries need migration)
- **Authentication** should remain with Supabase Auth
- **Optimization** opportunities exist with proper SWR caching strategies