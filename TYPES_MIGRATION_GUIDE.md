# Centralized Types Migration Guide

## Overview
This guide outlines the migration from scattered interface definitions to centralized types in `/types/shared.ts`.

## ✅ Completed Components
- `ProductBacklogRedesigned.tsx` - Updated to use `Sprint`, `Task`, `ProductBacklogProps`
- `TaskCardModern.tsx` - Updated to use `TaskCardProps`
- `EnhancedScrumBoard.tsx` - Updated to use `Task`, `Sprint`, `BoardColumn`
- `project-board.tsx` - Updated to use `BoardColumn`, `ProjectBoardProps`
- `ItemModal.tsx` - Updated to use `ItemModalProps`

## 📋 Remaining Components to Update

### High Priority (Core Scrum Components)
- [ ] `SprintBacklogView.tsx` - Use `SprintBacklogViewProps`
- [ ] `TaskAssigneeSelector.tsx` - Use `TaskAssigneeSelectorProps`
- [ ] `SprintBacklog.tsx`
- [ ] `ComprehensiveInlineForm.tsx`

### Medium Priority (Board/Project Components)
- [ ] `standalone-board-view.tsx` - Use `StandaloneBoardViewProps`
- [ ] `project-scrum-board.tsx`
- [ ] All board creation/edit components

### Low Priority (Other Components)
- [ ] UI components (error-state, loading-state, empty-state)
- [ ] Hook files (useUsers, useBoardData, etc.)
- [ ] Utility components

## 🔧 Migration Pattern

### Before (Local Interface)
```typescript
interface TaskCardProps {
  id: string
  title: string
  // ... rest of props
}

interface Task {
  id: string
  title: string
  // ... rest of fields
}
```

### After (Centralized Types)
```typescript
import { TaskCardProps, Task } from '@/types/shared';
// or
import { TaskCardProps, Task } from '@/types';
```

## 📁 Centralized Types Structure

### Core Entities
- `User` - User information
- `Task` - Task/item with all fields and relationships
- `Sprint` - Sprint information
- `Board` - Board with columns and tasks
- `Project` - Project information
- `Organization` - Organization structure
- `Label` - Label definitions

### Component Props
- `TaskCardProps` - Props for TaskCardModern
- `ProductBacklogProps` - Props for Product Backlog
- `ItemModalProps` - Props for ItemModal
- `SprintBacklogViewProps` - Props for Sprint Backlog
- And many more...

### API Types
- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated responses
- Form data types for various forms

## 🚀 Benefits
1. **Consistency** - All components use same type definitions
2. **Maintainability** - Single source of truth for types
3. **IntelliSense** - Better IDE support
4. **Reduced Duplication** - No scattered interfaces
5. **Type Safety** - Catching type mismatches across components

## ⚠️ Important Notes
- The centralized `Task` interface includes both legacy fields (`assignee`) and new fields (`taskAssignees`)
- Legacy database types are still imported from `@/types/database` for compatibility
- All new components should import from `@/types/shared` or `@/types`

## 🔄 Migration Steps for Each Component
1. Identify local interfaces that match centralized types
2. Add import from `@/types/shared`
3. Remove local interface definitions
4. Update any type references
5. Test component to ensure no TypeScript errors

## 📊 Current Status
- **Total files with interfaces**: 72
- **High priority completed**: 5/10 (50%)
- **Medium priority completed**: 2/20 (10%)
- **Low priority completed**: 0/42 (0%)

This migration improves code maintainability and ensures consistency across the entire codebase.