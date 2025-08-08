# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `bun dev` - Start development server with Turbopack (faster builds)
- `bun run build` - Build the application for production (includes Prisma generate)
- `bun run start` - Start production server
- `bun run lint` - Run ESLint to check code quality
- `bun run generate-types` - Generate TypeScript types from Supabase schema (legacy, kept for auth)

### Database Commands (Prisma)
- `bun run db:migrate` - Run database migrations
- `bun run db:generate` - Generate Prisma client
- `bun run db:studio` - Open Prisma Studio (database browser)
- `bun run db:push` - Push schema changes to database
- `bun run db:reset` - Reset database and apply migrations

### Dependencies
- Uses **Bun** as package manager (not npm/yarn)
- Built with **Next.js 15** (App Router)
- Uses **Prisma** for database ORM and **Supabase** for authentication & file storage
- UI components with **shadcn/ui** and **Radix UI**
- Drag and drop with **@dnd-kit**
- Forms with **react-hook-form** and **zod**
- Data fetching with **React Query (@tanstack/react-query)**
- **Motion for React** (modern animation library) - `motion` package only

## Architecture Overview

### Project Structure
This is a **VivifyScrum clone** - a comprehensive project management application with organizations, projects, boards, and tasks.

**Key Directories:**
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components organized by feature
- `lib/` - Utility functions and Supabase client setup
- `providers/` - React Context providers for global state
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `supabase/migrations/` - Database migrations
- `docs/` - Project documentation

### Database Architecture
- **Prisma ORM** with **PostgreSQL** database
- **Hierarchical structure**: Organizations → Projects → Boards → Tasks
- **Standalone boards** can exist without projects
- **Complex task relationships**: subtasks, dependencies, blocking items
- **Time tracking**: worklog entries, estimated vs actual hours
- **Team collaboration**: members, invitations, permissions

#### Sprint Column Architecture Rules
- **Backlog Sprint**: NEVER has sprint columns (`sprintColumns` table should be empty)
- **Regular Sprints**: Always have sprint columns (To Do, In Progress, Done by default)
- **Task Assignment Logic**:
  - Tasks in Backlog sprint: Only `sprintId` set, `sprintColumnId` always NULL
  - Tasks in regular sprints: Both `sprintId` and `sprintColumnId` set
  - Auto-assignment: Only assigns `sprintColumnId` for non-Backlog sprints
- **Board Creation**: Creates sprint columns ONLY for regular sprints (Sprint 1, Sprint 2, etc.)

### Authentication & Authorization
- **Supabase Auth** with email/password and OAuth
- **Middleware-based route protection** (`middleware.ts`)
- **Organization-based permissions** with Prisma queries
- **Multi-tenant architecture** with organization isolation

### Global State Management
- **OrganizationProvider** manages active organization globally
- **SupabaseProvider** handles authentication state
- **RealtimeProvider** for real-time updates
- **NotificationsProvider** for system notifications

## Key Features

### Organization System
- **Multi-tenant** - users can belong to multiple organizations
- **Active organization** persisted in localStorage
- **Organization switching** via org-switcher dropdown
- **Global organization context** available throughout app

### Project Management
- **Scrum and Kanban boards** with drag-and-drop
- **Sprint management** with analytics and dedicated Sprint Backlog views
- **Sprint Backlog** with customizable columns, WIP limits, and export functionality
- **Six task types**: Story (new functionality), Bug (errors/flaws), Task (technical work), Improvement (existing features needing work), Note (valuable information), Idea (product improvement thoughts)
- **Task relationships**: parent-child (subtasks), blocking items, dependencies
- **Subtask management**: Add existing items or create new subtasks inline
- **Time tracking** with worklog entries
- **File attachments** with S3 storage and signed URLs for secure access

### VivifyScrum Implementation
- **Authentic VivifyScrum experience** - UI and UX matches VivifyScrum exactly
- **Product Backlog view** - Prioritized backlog with sprint columns layout
- **Sprint Backlog view** - Dedicated execution board for active sprints
- **Proper separation** - Clear distinction between planning and execution phases

### Sprint Backlog Features
- **Dedicated Sprint Backlog page** accessible from Product Backlog dropdown
- **Default columns**: To Do, In Progress, Done (with drag-and-drop)
- **Custom columns**: Add, rename, delete, and mark columns as done
- **WIP limits**: Set limits on columns to prevent overload and improve flow
- **Sprint Goal**: Set, edit, and display sprint goals prominently
- **Search and Filter**: Find tasks quickly within the sprint
- **Export functionality**: Export columns as CSV or JSON
- **Sprint analytics**: Burndown charts, velocity tracking, and progress metrics
- **Complete Sprint**: Finish sprints and move unfinished items back to Product Backlog

### Product Backlog Features
- **VivifyScrum-style layout** - Product Backlog + Sprint columns side-by-side
- **Drag-and-drop planning** - Move items between backlog and sprints
- **Sprint management** - Create, start, and manage sprints from one view
- **Sprint states**: Planning, Active, Completed with proper visual indicators
- **Sprint goals and dates** - Full sprint lifecycle management

### Real-time Features
- **Live board updates** when tasks are moved
- **Real-time notifications** for task changes
- **Collaborative editing** with activity feeds

### Task Relations & Hierarchy
- **Parent-Child Relationships**: Tasks can have subtasks that inherit parent's column and sprint
- **Blocking Relationships**: Tasks can block or be blocked by other tasks
- **Relations Tab** in ItemModal with four sections:
  - Parent Item: Shows and allows changing parent task
  - Subitems: List of child tasks with inline creation
  - This Item Is Blocking: Tasks blocked by current item
  - This Item Is Blocked By: Tasks blocking current item
- **Search Integration**: Find existing tasks to add as relations
- **Circular Reference Prevention**: API validates against circular dependencies

### Deep Linking & URL Parameters
- **Task URLs**: `/boards/[boardId]?task=[taskId]` auto-opens task dialog
- **Copy Link**: Generate shareable task URLs from dropdown menu
- **Auto-open behavior**: Board detects task parameter and opens dialog on load
- **Suspense boundaries**: Required for useSearchParams to prevent hydration issues

## Development Patterns

### Component Organization
- **Feature-based folders**: `components/projects/`, `components/boards/`
- **Shared UI components**: `components/ui/` (shadcn/ui)
- **Layout components**: `components/dashboard/`

### Data Fetching
- **React Query** for client-side data fetching with automatic caching and revalidation
- **Server Actions** for mutations (create, update, delete)
- **Prisma client** for database queries
- **Type-safe** with Prisma generated types

### Authentication Patterns
- **useSupabase()** hook for auth state
- **Server-side auth** in API routes and middleware
- **Protected routes** with automatic redirects
- **Prisma queries** with user-based filtering for data security

### State Management
- **React Context** for global state (organizations, auth)
- **Local state** with useState/useReducer
- **React Query cache** for server state with automatic invalidation
- **localStorage** for persistence

## Important Files

### Configuration
- `next.config.ts` - Next.js configuration with Supabase image domains
- `middleware.ts` - Route protection and authentication
- `tsconfig.json` - TypeScript configuration with `@/*` path aliases
- `components.json` - shadcn/ui configuration

### API Endpoints
- `/api/tasks/[id]/relations` - Manage task relationships (GET, POST, PUT, DELETE)
- `/api/tasks/search` - Search tasks by title or item code
- `/api/tasks/[id]/subtasks` - Create subtasks with inherited properties
- `/api/tasks/[id]/attachments` - File upload with S3 integration and signed URLs

### Key Components
- `components/scrum/RelationsTab.tsx` - Complete UI for task relations management
- `components/scrum/ItemModal.tsx` - Task dialog with no auto-close behavior
- `components/ui/file-upload-queue.tsx` - File upload with auto-clear and S3 integration

### Database
- `prisma/schema.prisma` - Prisma schema definition
- `lib/prisma.ts` - Prisma client setup
- `prisma/migrations/` - Database schema migrations
- `types/database.ts` - Generated TypeScript types from Supabase (legacy, kept for auth)
- `lib/supabase/` - Supabase client setup (browser and server) - used for auth & file storage

### Providers
- `providers/supabase-provider.tsx` - Authentication state
- `providers/organization-provider.tsx` - Organization context
- `providers/realtime-provider.tsx` - Real-time updates
- `providers/notifications-provider.tsx` - Notification system

## Development Guidelines

### IMPORTANT: Complete Functionality Rule
- **ALWAYS implement complete functionality**, not just UI/UX changes
- **Every feature must be fully functional** with proper:
  - Database integration (create, read, update, delete operations)
  - API endpoints when needed
  - Error handling and loading states
  - Data persistence and real-time updates
  - User feedback (toasts, notifications)
- **Never leave placeholder functionality** - if a button exists, it must work
- **Test all user interactions** to ensure they work end-to-end
- **Follow the existing patterns** for similar features in the codebase

### IMPORTANT: Naming Convention Rule
- **NEVER use "vivify" or "VivifyScrum" in code**, file names, or component names
- **Use generic names** like "scrum", "board", "task", "modern", "enhanced" instead
- **This is a ScrumSan application**, not VivifyScrum
- **All references should be to the actual application name**

### IMPORTANT: Component Consistency & Reusability Rule
- **ALWAYS maintain consistency** between Kanban and Scrum boards
- **Use ComprehensiveInlineForm** for all task creation across board types
- **Remove unused components** and avoid duplicate code
- **Prioritize reusable components** in every change
- **Consistency requirements**:
  - Same task card component (TaskCardModern) across all board views
  - Same inline form component (ComprehensiveInlineForm) for task creation
  - Same dropdown functionality (# mentions with complete attributes)
  - Same user experience regardless of board type
- **When updating one board type**, always update others to maintain consistency

### IMPORTANT: Global Constants Rule
- **ALWAYS use centralized constants** from `/lib/constants.ts`
- **NEVER create scattered constants** in individual components
- **All configuration must be in one place**:
  - Item/Task types, priorities, story points, statuses
  - Colors, icons, and styling configurations
  - Helper functions for type checking and color utilities
- **When adding new constants**, add them to the global constants file
- **Use provided helper functions** like `getItemTypeById()`, `getPriorityColor()`, etc.
- **Maintain consistency** across all components using the same constants

### IMPORTANT: Component Version Management Rule
- **ALWAYS use the latest redesigned components**, not old versions
- **When a component is redesigned**, immediately:
  - Update all imports to use the new version (e.g., `ItemModalRedesigned`)
  - Remove the old component file completely to avoid confusion
  - Migrate all functionality to the new version
- **Never work on old component versions** - always update the current/latest version
- **File naming for redesigned components**:
  - Keep redesigned suffix during development: `ComponentRedesigned.tsx`
  - After migration is complete, rename to replace the original component
- **This prevents accidentally updating wrong files** and maintains code consistency

### 🚨 CRITICAL: Task Status Rule (ZERO TOLERANCE)
- **Tasks DO NOT have a status field** - Task state is determined by column placement ONLY
- **ABSOLUTELY FORBIDDEN**: Any use of status field for Task model in ANY part of the codebase
- **Column-based state management ONLY**: Tasks' state is defined by which column they are in
- **COMPREHENSIVE PROHIBITION**:
  - ❌ Database queries with task.status
  - ❌ API endpoints accepting/returning status for tasks
  - ❌ TypeScript interfaces with status field for tasks
  - ❌ Frontend components displaying task status
  - ❌ Task filtering by status
  - ❌ Status dropdowns for tasks
  - ❌ Status comparisons or conditions
  - ❌ Status constants for tasks
  - ❌ Status-based analytics
  - ❌ Status imports from task-related utilities

### ✅ APPROVED TASK STATE METHODS:
1. **Backlog tasks**: `!columnId && !sprintColumnId && !labels.includes('__followup__')`
2. **Sprint tasks**: `sprintColumnId || sprintId`
3. **Followup tasks**: `!columnId && !sprintColumnId && labels.includes('__followup__')`
4. **Board tasks**: `columnId !== null`

### 🛡️ ENFORCEMENT MECHANISMS:
1. **Comprehensive audit completed**: All 50+ status references removed from codebase
2. **TypeScript interfaces cleaned**: No status fields in Task-related interfaces  
3. **API endpoints secured**: All task endpoints reject status parameters
4. **Constants removed**: All TASK_STATUSES and related utilities deleted
5. **Documentation updated**: Zero-tolerance policy documented

### ⚠️ IF YOU SEE ANY TASK STATUS REFERENCES:
1. **STOP IMMEDIATELY** - Do not proceed with implementation
2. **Remove the status reference** completely
3. **Replace with column-based logic** if needed
4. **Update this documentation** if new patterns emerge

This rule has **ZERO TOLERANCE** - any status field usage for tasks will cause Prisma validation errors and application failures.

## 🚨 CRITICAL: NO LEGACY COMPATIBILITY RULE (ZERO TOLERANCE)

### ⚠️ ABSOLUTELY FORBIDDEN: Adding Legacy Fields for Backward Compatibility ⚠️
- **NEVER add deprecated fields** like `assigneeId`, `reviewerId`, `labels` array to interfaces
- **NEVER create backward compatibility** by making old fields optional
- **ALWAYS fix the data source** instead of compromising type definitions
- **PRINCIPLE**: Update components to use new schema, don't make schema support old components

### 🔴 BANNED PRACTICES (Zero Tolerance)
- ❌ Adding `assigneeId?: string` to Task interface
- ❌ Adding `reviewerId?: string` to Task interface  
- ❌ Adding `labels?: string[]` to Task interface
- ❌ Any "// Legacy field for compatibility" comments
- ❌ Making required fields optional to support old data
- ❌ Adding backward compatibility type unions
- ❌ Temporary compatibility solutions

### ✅ CORRECT APPROACH WHEN TYPE ERRORS OCCUR
1. **Identify the data source** returning old schema data
2. **Update the data source** to return new schema (use Prisma, not Supabase)
3. **Transform data at source** to match new interfaces
4. **Replace Supabase queries** with proper Prisma API calls
5. **Update components** to use new junction table patterns

### 🛡️ ENFORCEMENT
- **Immediate revert** if legacy fields are added to interfaces
- **No exceptions** - fix root cause, not symptoms
- **Clean schema only** - maintain new junction table approach
- **Component responsibility** - adapt to new schema, don't adapt schema to old components

### ⚠️ WHEN YOU GET TYPE ERRORS:
1. **DO NOT** add legacy fields to interfaces
2. **DO NOT** make fields optional for compatibility
3. **FIND** the component/query returning old data
4. **FIX** that component to use new schema
5. **VERIFY** all data sources use Prisma with proper includes

This rule has **ZERO TOLERANCE** - maintaining clean schema is critical for application integrity.

### IMPORTANT: UI Component Consistency Rule
- **ALWAYS use standardized UI components** for consistent user experience
- **Loading States**: Use components from `/components/ui/loading-state.tsx`
  - `PageLoadingState` for full page loading (60vh min-height)
  - `CardLoadingState` for card/section loading
  - `InlineLoadingState` for inline loading indicators
  - `SkeletonLoadingState` for skeleton placeholders
- **Error States**: Use components from `/components/ui/error-state.tsx`
  - `PageErrorState` for full page errors with retry/go home actions
  - `NetworkErrorState` for connection issues
  - `PermissionErrorState` for access denied scenarios
  - `NotFoundErrorState` for 404-type errors
  - `ValidationErrorState` for form validation errors
- **Empty States**: Use components from `/components/ui/empty-state.tsx`
  - `OrganizationEmptyState`, `BoardEmptyState`, `ProjectEmptyState`, etc.
  - Specialized variants with proper animations and call-to-actions

### IMPORTANT: Replace All Basic Loading/Error Patterns
- **NEVER use basic patterns like**:
  ```typescript
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  ```
- **ALWAYS use the standardized components instead**:
  ```typescript
  if (isLoading) return <PageLoadingState message="Loading data..." />
  if (error) return <PageErrorState error={error} onRetry={refetch} />
  if (data.length === 0) return <EmptyState type="boards" action={{ label: "Create Board", onClick: handleCreate }} />
  ```
- **This applies to ALL pages and components** - existing and new

### 🚨 CRITICAL: Logging Rule (MANDATORY)
- **NEVER use console.log, console.error, console.warn directly**
- **ALWAYS use the logger utility from `/lib/logger.ts`**
- **Logger automatically hides logs in production** (except errors)
- **Import and use like this**:
  ```typescript
  import { logger } from '@/lib/logger'
  
  // Instead of console.log
  logger.log('Debug message')
  logger.info('Information')
  logger.debug('Debug info')
  
  // Instead of console.error
  logger.error('Error occurred', error)
  
  // Instead of console.warn
  logger.warn('Warning message')
  
  // Special logging utilities
  logger.api.request('GET', '/api/users')
  logger.db.query('findMany', 'User', { where: { ... } })
  logger.component.mount('TaskCard', props)
  ```
- **Benefits**:
  - ✅ No console output in production (cleaner, more secure)
  - ✅ Consistent log formatting with prefixes
  - ✅ Better debugging with categorized logs
  - ✅ Performance monitoring capabilities
  - ✅ Easy to enable/disable specific log categories

### IMPORTANT: Modal Behavior Rule
- **ItemModal must NEVER auto-close** on any action (save, create, etc.)
- **Use Dialog props to prevent closing**:
  ```typescript
  onInteractOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
  ```
- **Only close when user explicitly clicks close button**
- **This ensures users can perform multiple actions** without reopening
- **NEVER call setSelectedTask(null) in onUpdate callbacks** - this auto-closes the modal:
  ```typescript
  // ❌ BAD - Auto-closes modal
  onUpdate={() => {
    fetchData()
    setSelectedTask(null) // Don't do this!
  }}
  
  // ✅ GOOD - Keeps modal open
  onUpdate={() => {
    fetchData()
  }}
  ```

### IMPORTANT: Popover in Dialog Rule
- **ALWAYS set modal={true} on Popover components inside Dialog components**
- **This prevents focus trap conflicts and interaction issues**:
  ```typescript
  <Dialog open={isOpen}>
    <DialogContent>
      <Popover modal={true}>
        <PopoverTrigger>...</PopoverTrigger>
        <PopoverContent>...</PopoverContent>
      </Popover>
    </DialogContent>
  </Dialog>
  ```
- **Without modal={true}, Popovers inside Dialogs may not work correctly**

### IMPORTANT: Subtask Inheritance Rule
- **Subtasks inherit parent properties**:
  - Column assignment (columnId)
  - Sprint assignment (sprintColumnId)
  - Board assignment (boardId)
- **Item codes are auto-generated** using board name initials
- **Subtasks appear in the same column** as their parent
- **Moving parent tasks should consider** moving subtasks together

### IMPORTANT: File Upload & S3 Integration
- **Always generate signed URLs** for S3 file access
- **Handle image preview errors** with React state, not DOM manipulation
- **Auto-clear completed uploads** after 3 seconds
- **Use proper cleanup** with useRef for timers
- **Support drag-and-drop** and click-to-upload

### IMPORTANT: Hydration & Suspense Patterns
- **Wrap useSearchParams in Suspense** to prevent hydration errors:
  ```typescript
  <Suspense fallback={<BoardSkeleton />}>
    <BoardContent initialTaskId={null} />
  </Suspense>
  ```
- **Extract client components** when using browser-only APIs
- **Use useEffect for URL parameter handling** after hydration

### 🚨 CRITICAL: Database Indexing Rule (MANDATORY FOR ALL MIGRATIONS)

#### ⚠️ ABSOLUTELY REQUIRED: Always Add Indexes When Creating Database Migrations ⚠️
- **EVERY foreign key MUST have an index** - No exceptions
- **EVERY commonly queried field MUST be indexed**
- **ALL junction tables MUST have composite indexes**
- **Performance is NOT optional** - Indexes are critical for scale

#### 🔴 MANDATORY INDEXING PATTERNS (Zero Tolerance)
When creating ANY Prisma model, ALWAYS add these indexes:

**Foreign Key Indexes (Required for ALL foreign keys)**:
```prisma
model Task {
  boardId    String  @map("board_id") @db.Uuid
  columnId   String? @map("column_id") @db.Uuid
  createdBy  String? @map("created_by") @db.Uuid
  
  // MANDATORY: Index every foreign key
  @@index([boardId])
  @@index([columnId])
  @@index([createdBy])
}
```

**Junction Table Indexes (Required for ALL many-to-many relationships)**:
```prisma
model TaskAssignee {
  taskId String @map("task_id") @db.Uuid
  userId String @map("user_id") @db.Uuid
  
  // MANDATORY: Index both foreign keys + composite unique
  @@unique([taskId, userId])
  @@index([taskId])
  @@index([userId])
}
```

**Composite Indexes (Required for common query patterns)**:
```prisma
model Task {
  boardId        String  @map("board_id") @db.Uuid
  columnId       String? @map("column_id") @db.Uuid
  sprintId       String? @map("sprint_id") @db.Uuid
  
  // MANDATORY: Composite indexes for common queries
  @@index([boardId, columnId])
  @@index([boardId, sprintId])
  @@index([boardId, createdAt(sort: Desc)])
}
```

**Timestamp Indexes (Required for sorting and filtering)**:
```prisma
model Comment {
  taskId    String   @map("task_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  
  // MANDATORY: Timestamp indexes for sorting
  @@index([taskId, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
}
```

#### 📋 INDEXING CHECKLIST (Check ALL before migration)
For EVERY new model or field:
- [ ] All foreign key fields have `@@index([fieldName])`
- [ ] Junction tables have individual + composite indexes
- [ ] Timestamp fields used for sorting have indexes
- [ ] Common filter fields (organizationId, userId, status) are indexed
- [ ] Query patterns have appropriate composite indexes
- [ ] No unused indexes (remove if not needed)

#### 🛡️ PERFORMANCE REQUIREMENTS
- **Query Response Time**: <100ms for indexed queries
- **No Full Table Scans**: All queries must use indexes
- **Scalability**: Must handle 100k+ records efficiently
- **Foreign Key Performance**: JOINs must be lightning fast

#### ⚠️ ENFORCEMENT MECHANISMS
1. **Pre-Migration Review**: Check all indexes before `prisma migrate dev`
2. **Database Analysis**: Use `EXPLAIN ANALYZE` for complex queries
3. **Performance Testing**: Monitor query times after deployment
4. **Production Monitoring**: Watch for slow queries in Supabase dashboard

#### 🚀 COMMON INDEXING PATTERNS BY MODEL TYPE

**Organization-related models**:
```prisma
@@index([organizationId])
@@index([organizationId, createdAt(sort: Desc)])
@@index([organizationId, userId]) // For member lookups
```

**Task-related models**:
```prisma
@@index([taskId])
@@index([taskId, createdAt(sort: Desc)])
@@index([userId, taskId]) // For user's tasks
```

**Board-related models**:
```prisma
@@index([boardId])
@@index([boardId, position]) // For ordering
@@index([boardId, userId]) // For permissions
```

#### ❌ FORBIDDEN PRACTICES (Never Do This)
- Creating models without foreign key indexes
- Adding fields that will be filtered without indexes  
- Junction tables without individual foreign key indexes
- Timestamp fields without sorting indexes
- Complex queries without EXPLAIN ANALYZE testing
- Production deployment without index verification

#### ✅ VERIFICATION STEPS (Required Before Production)
1. **Test Query Performance**: All common queries <100ms
2. **Check Index Usage**: Verify indexes are actually used
3. **Monitor Database**: No slow query warnings
4. **Load Testing**: Performance under realistic data volumes

#### 🔧 MIGRATION WORKFLOW
```bash
# 1. Create model with proper indexes in schema.prisma
# 2. Verify all foreign keys have indexes
# 3. Add composite indexes for common patterns
# 4. Test locally
bunx prisma migrate dev --name descriptive_name

# 5. Deploy to production
bunx prisma migrate deploy

# 6. Monitor performance in production
```

This rule has **ZERO TOLERANCE** - No migration without proper indexing. Database performance is critical for user experience and application scalability.

### 🚀 CRITICAL: Optimistic UI Rule (MANDATORY FOR ALL FEATURES)

#### Core Principle: Always Update UI First, Validate Later
- **IMMEDIATE UI UPDATES**: Every user action must update the UI instantly before API calls
- **PERCEIVED PERFORMANCE**: Create illusion of zero latency for all interactions
- **USER CONFIDENCE**: Provide instant visual feedback to build trust and engagement
- **GRACEFUL ROLLBACK**: Handle failures smoothly with clear error messages and state restoration

#### 🔴 MANDATORY IMPLEMENTATION PATTERNS
1. **All Create Operations**:
   ```typescript
   // ✅ CORRECT - Optimistic creation
   const handleCreate = async (data) => {
     // 1. Generate temporary ID
     const tempId = `temp_${Date.now()}`
     
     // 2. Update UI immediately
     setItems(prev => [...prev, { ...data, id: tempId, isOptimistic: true }])
     
     // 3. Make API call
     try {
       const result = await createItem(data)
       // 4. Replace temp item with real data
       setItems(prev => prev.map(item => 
         item.id === tempId ? result : item
       ))
       toast.success('Item created successfully')
     } catch (error) {
       // 5. Rollback on failure
       setItems(prev => prev.filter(item => item.id !== tempId))
       toast.error('Failed to create item')
     }
   }
   ```

2. **All Update Operations**:
   ```typescript
   // ✅ CORRECT - Optimistic updates
   const handleUpdate = async (id, updates) => {
     // 1. Store previous state
     const previousItem = items.find(item => item.id === id)
     
     // 2. Update UI immediately
     setItems(prev => prev.map(item => 
       item.id === id ? { ...item, ...updates } : item
     ))
     
     // 3. Make API call
     try {
       await updateItem(id, updates)
       toast.success('Updated successfully')
     } catch (error) {
       // 4. Rollback to previous state
       setItems(prev => prev.map(item => 
         item.id === id ? previousItem : item
       ))
       toast.error('Failed to update')
     }
   }
   ```

3. **All Delete Operations**:
   ```typescript
   // ✅ CORRECT - Optimistic deletion
   const handleDelete = async (id) => {
     // 1. Store item for potential restoration
     const deletedItem = items.find(item => item.id === id)
     const deletedIndex = items.findIndex(item => item.id === id)
     
     // 2. Remove from UI immediately
     setItems(prev => prev.filter(item => item.id !== id))
     
     // 3. Make API call
     try {
       await deleteItem(id)
       toast.success('Deleted successfully')
     } catch (error) {
       // 4. Restore item at original position
       setItems(prev => {
         const newItems = [...prev]
         newItems.splice(deletedIndex, 0, deletedItem)
         return newItems
       })
       toast.error('Failed to delete')
     }
   }
   ```

4. **Drag & Drop Operations** (Already Implemented):
   ```typescript
   // ✅ CORRECT - Optimistic reordering
   const handleDragEnd = async (result) => {
     // 1. Update UI immediately
     const newOrder = reorderItems(items, result)
     setItems(newOrder)
     
     // 2. Make API call
     try {
       await updateOrder(newOrder)
     } catch (error) {
       // 3. Rollback to original order
       setItems(originalItems)
       toast.error('Failed to reorder')
     }
   }
   ```

#### 🛡️ REQUIRED INFRASTRUCTURE
1. **Use `useOptimisticUpdates` Hook**:
   - Located in `/lib/optimistic-updates.ts`
   - Provides standardized optimistic update patterns
   - Handles rollback and error states automatically

2. **Visual Indicators for Optimistic State**:
   - Add subtle opacity or loading spinners for optimistic items
   - Use `isOptimistic` flag to differentiate pending items
   - Show sync indicators when background operations are running

3. **Error Handling Requirements**:
   - Always provide rollback capability
   - Show clear error messages with retry options
   - Maintain data consistency after failures
   - Log errors for debugging but don't expose technical details

4. **Performance Considerations**:
   - Use React Query's optimistic updates for cache consistency
   - Implement debouncing for rapid updates (e.g., typing)
   - Batch multiple operations when possible
   - Maintain local state for instant feedback

#### ⚠️ FORBIDDEN PRACTICES
- ❌ Waiting for API response before updating UI
- ❌ Showing loading states instead of optimistic updates
- ❌ Disabling UI during API calls
- ❌ Not implementing rollback for failures
- ❌ Using synchronous patterns that block UI

#### 📋 Implementation Checklist for Every Feature
- [ ] UI updates immediately on user action
- [ ] Temporary IDs for new items
- [ ] Previous state stored for rollback
- [ ] Error handling with state restoration
- [ ] Success/error toast notifications
- [ ] Visual indicators for optimistic items
- [ ] Consistent behavior across all CRUD operations

#### 🎯 Benefits We're Achieving
- ✅ **Instant Feedback**: Zero perceived latency
- ✅ **Better UX**: Users feel the app is fast and responsive
- ✅ **Increased Engagement**: Users more likely to interact
- ✅ **Professional Feel**: Modern, polished application
- ✅ **Competitive Advantage**: Matches top-tier apps like Notion, Linear

#### Example: Adding a Comments Feature
BAD (UI only):
- ✗ Create comment UI component
- ✗ Add comment form that doesn't save
- ✗ Display static comment list

GOOD (Complete functionality):
- ✓ Create `task_comments` table in Prisma schema
- ✓ Add API endpoints for comments CRUD
- ✓ Build comment component with:
  - Form that saves to database
  - Real-time comment list updates
  - User avatars and timestamps
  - Edit/delete functionality
  - Loading states while saving
  - Error handling with user feedback
  - Optimistic updates for better UX

### Code Style
- **TypeScript strict mode** enabled
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **shadcn/ui** components for consistency

### Database Operations
- **Always use Prisma client** for database queries
- **Type-safe queries** with Prisma generated types
- **User-based filtering** for data security (no RLS needed)
- **Proper error handling** for database operations
- **Optimistic updates** where appropriate

### Performance
- **Next.js App Router** with server components
- **SWR caching** for efficient data fetching
- **Lazy loading** for heavy components
- **Prisma query optimization** with proper relations and indexing

## Common Development Tasks

### Adding New Features
1. **Check existing patterns** in similar components
2. **Plan the complete implementation**:
   - UI components with all interactions
   - Database schema updates if needed
   - API endpoints for CRUD operations
   - Real-time updates where applicable
   - Error handling and loading states
3. **Implement backend first**:
   - Update Prisma schema for new data models
   - Create/update API endpoints
   - Test database operations
4. **Build the frontend**:
   - Create components with proper TypeScript types
   - Connect to backend APIs
   - Add loading and error states
   - Implement optimistic updates
5. **Add user feedback**:
   - Success/error toasts
   - Loading indicators
   - Validation messages
6. **Test the complete flow**:
   - Create, read, update, delete operations
   - Edge cases and error scenarios
   - Real-time updates if applicable
   - Task relations and circular dependency prevention
   - File uploads with proper S3 integration
   - URL deep linking functionality

### Database Changes
1. **Update Prisma schema** in `prisma/schema.prisma`
2. **Create migration** with `bun run db:migrate`
3. **Generate Prisma client** with `bun run db:generate`
4. **Update components** using affected models

### Authentication
- **Use middleware** for route protection
- **Filter queries by user** in Prisma for data access
- **Handle auth state** with useSupabase hook
- **Implement proper error handling** for auth failures

## Testing & Debugging

### No specific test framework configured
- **Manual testing** in development
- **Browser dev tools** for debugging
- **Prisma Studio** for database inspection (`bun run db:studio`)
- **Next.js built-in debugging** features

## 🚨 CRITICAL: Documentation Policy & Library Standards

### ALWAYS Use Context7 MCP for Latest Documentation
- **NEVER use outdated documentation** or assume library syntax
- **ALWAYS use Context7 MCP** to fetch the latest documentation before implementing any library features
- **VERIFY current syntax** for all dependencies, especially rapidly evolving ones
- **CHECK official documentation** at the source (e.g., motion.dev, nextjs.org) using Context7 MCP

### Motion for React (Animation Library) - CURRENT STANDARDS
- **Package**: Use `motion` package ONLY (v12.23.6+)
- **NEVER use**: `framer-motion` (legacy package)
- **Import Syntax**: `import { motion, AnimatePresence } from 'motion/react'`
- **For React Server Components**: `import * as motion from 'motion/react-client'`
- **Documentation**: Always check https://motion.dev/docs/react using Context7 MCP for latest syntax

### Modern Motion Components Usage
```typescript
// ✅ CORRECT - Latest motion/react syntax
import { motion, AnimatePresence } from 'motion/react'

// Basic motion component
<motion.div
  layout
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ 
    type: "spring", 
    damping: 20, 
    stiffness: 300 
  }}
>
  Content
</motion.div>

// ❌ FORBIDDEN - Legacy framer-motion syntax
import { motion } from 'framer-motion' // DON'T USE
```

### Documentation Update Protocol
1. **Before implementing any library feature**: Use Context7 MCP to fetch latest docs
2. **When encountering build errors**: Check if library syntax has changed using Context7 MCP
3. **Update CLAUDE.md**: When new library versions or syntax changes are discovered
4. **Verify compatibility**: Always test build and runtime after updating library usage

## 🚨 CRITICAL: Auto-Commit Rule (ZERO TOLERANCE)

### ⚠️ MANDATORY AUTO-COMMIT AFTER EVERY USER REQUEST ⚠️
- **ABSOLUTE REQUIREMENT**: Must create git commit after completing ANY user request
- **NO EXCEPTIONS**: This rule applies to ALL changes, no matter how small
- **ENFORCEMENT**: If auto-commit is skipped, immediately create one when reminded
- **PURPOSE**: Create restore checkpoints for rollback if needed

### 🔴 WHEN TO AUTO-COMMIT (Always Required)
- ✅ After fixing any error or bug
- ✅ After adding/modifying any code 
- ✅ After updating any file or configuration
- ✅ After creating new files or utilities
- ✅ After refactoring or optimization changes
- ✅ After schema updates or database changes
- ✅ After any kind of code improvement
- ✅ Even for single-line changes or typo fixes

### 📝 Standard Commit Message Format
```bash
🤖 Auto-commit: [Brief description of changes]

- [Key change 1]
- [Key change 2] 
- [Key change 3]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 🔄 Auto-Commit Protocol (Mandatory Steps)
1. **STEP 1**: Complete the user's request
2. **STEP 2**: IMMEDIATELY run `git add .`
3. **STEP 3**: IMMEDIATELY run `git commit -m "..."` with descriptive message
4. **STEP 4**: Verify commit succeeded with `git status`
5. **FAILURE TO FOLLOW**: If reminded about missing auto-commit, create it immediately

### 🎯 Auto-Commit Benefits
- ✅ **Checkpoint Creation**: Every change can be easily reverted
- ✅ **Progress Tracking**: Clear history of all modifications
- ✅ **Collaboration**: Transparent record of all AI-assisted changes
- ✅ **Safety Net**: User can restore to any previous state
- ✅ **Accountability**: Complete audit trail of development work

### When to Auto-Commit
- ✅ After fixing bugs or performance issues
- ✅ After implementing new features
- ✅ After major refactoring or optimization
- ✅ After updating dependencies or configurations
- ✅ After documentation updates
- ✅ When user explicitly requests changes be saved
- ❌ Do NOT commit broken/non-building code
- ❌ Do NOT commit incomplete implementations (unless user requests it)

## Environment Setup

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string for Prisma
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (for auth & storage)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for auth & storage)
- Additional Supabase variables for auth and storage

### Development Database
- **Prisma** connects to PostgreSQL database
- **Supabase** used only for authentication and file storage
- **Migrations** managed through Prisma CLI