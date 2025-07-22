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
- Data fetching with **SWR**

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
- **SWR** for client-side data fetching with automatic revalidation
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
- **SWR cache** for server state
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

### IMPORTANT: Modal Behavior Rule
- **ItemModal must NEVER auto-close** on any action (save, create, etc.)
- **Use Dialog props to prevent closing**:
  ```typescript
  onInteractOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
  ```
- **Only close when user explicitly clicks close button**
- **This ensures users can perform multiple actions** without reopening

### IMPORTANT: Subtask Inheritance Rule
- **Subtasks inherit parent properties**:
  - Column assignment (columnId)
  - Sprint assignment (sprintColumnId)
  - Status if applicable
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