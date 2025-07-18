# Component Architecture Documentation

## Overview

This document describes the component architecture for the project management application, focusing on reusability, maintainability, and consistency across all board types.

## Design Principles

### 1. Reusability First
- Components designed for multiple contexts
- Minimal external dependencies
- Configurable through props
- Generic interfaces where possible

### 2. Single Responsibility
- Each component has one clear purpose
- Separation of concerns between UI and business logic
- Modular design for easy testing

### 3. Composition Over Inheritance
- Small, composable components
- Higher-order components for shared functionality
- Flexible prop interfaces

## Core Components

### TaskForm (Primary Reusable Component)

**File**: `/components/scrum/TaskForm.tsx`

**Purpose**: Universal task creation/editing form

**Reusability Features**:
- Board-agnostic design
- Configurable field visibility
- Multiple submission handlers
- Custom validation rules

**Usage Contexts**:
- Product Backlog task creation
- Standalone board task management
- Project board task creation
- Task editing modals

```typescript
interface TaskFormProps {
  formData: TaskFormData
  onFormDataChange: (data: TaskFormData) => void
  onSubmit: () => void
  onCancel: () => void
  boardId?: string
  users?: User[]
  currentUserId?: string
  customFields?: CustomField[]
  boardConfig?: BoardConfiguration
  isLoading?: boolean
  submitLabel?: string
}
```

### PerformersSelector

**File**: `/components/scrum/PerformersSelector.tsx`

**Purpose**: User assignment interface for assignees and reviewers

**Reusability Features**:
- Dual-mode selection (assignees/reviewers)
- Search functionality
- Quick self-assignment
- Multi-select capability

**Usage Contexts**:
- Task forms
- User management interfaces
- Team assignment workflows
- Review process setup

### EstimationSelector

**File**: `/components/scrum/EstimationSelector.tsx`

**Purpose**: Business value and effort estimation

**Reusability Features**:
- Multiple estimation types
- Configurable value scales
- Real-time ROI calculation
- Board-specific configuration

**Usage Contexts**:
- Task estimation
- Planning poker sessions
- Value assessment workflows
- ROI reporting

### ItemTypeSelector

**File**: `/components/scrum/ItemTypeSelector.tsx`

**Purpose**: Work item categorization

**Reusability Features**:
- Extensible type definitions
- Icon and color customization
- Description support
- Filtering capabilities

**Usage Contexts**:
- Task creation
- Bulk editing operations
- Reporting and analytics
- Template creation

### CustomFieldsEditor

**File**: `/components/scrum/CustomFieldsEditor.tsx`

**Purpose**: Dynamic custom field management

**Reusability Features**:
- Multiple field types
- Validation framework
- Dynamic rendering
- Configuration-driven

**Usage Contexts**:
- Task forms
- Board configuration
- Admin panels
- Data collection workflows

### LabelSelector

**File**: `/components/scrum/LabelSelector.tsx`

**Purpose**: Label and epic management

**Reusability Features**:
- Color-coded visualization
- Auto-creation capability
- Board-scoped labels
- Multi-select interface

**Usage Contexts**:
- Task labeling
- Epic management
- Filtering and search
- Organization systems

## Component Composition Patterns

### Dialog Wrapper Pattern

**Purpose**: Consistent dialog behavior across forms

```typescript
const TaskDialog = ({ trigger, boardId, onSuccess }) => (
  <Dialog>
    <DialogTrigger>{trigger}</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Task</DialogTitle>
      </DialogHeader>
      <TaskForm
        boardId={boardId}
        onSubmit={handleSubmit}
        onCancel={() => setOpen(false)}
      />
    </DialogContent>
  </Dialog>
)
```

### Form Provider Pattern

**Purpose**: Shared form state management

```typescript
const TaskFormProvider = ({ children, initialData }) => {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})
  
  return (
    <TaskFormContext.Provider value={{ formData, setFormData, errors }}>
      {children}
    </TaskFormContext.Provider>
  )
}
```

### Configuration Pattern

**Purpose**: Environment-specific component behavior

```typescript
const ConfigurableTaskForm = ({ boardConfig, ...props }) => {
  const config = useMemo(() => ({
    ...defaultConfig,
    ...boardConfig
  }), [boardConfig])
  
  return <TaskForm {...props} boardConfig={config} />
}
```

## Shared Utilities

### Form Validation

**File**: `/lib/validation/task-validation.ts`

```typescript
export const validateTaskForm = (data: TaskFormData): ValidationResult => {
  const errors: Record<string, string> = {}
  
  if (!data.title.trim()) {
    errors.title = 'Title is required'
  }
  
  // Additional validation logic
  
  return { isValid: Object.keys(errors).length === 0, errors }
}
```

### Data Transformation

**File**: `/lib/transforms/task-transforms.ts`

```typescript
export const transformFormToApi = (formData: TaskFormData): ApiTaskData => {
  return {
    title: formData.title,
    assignees: formData.assigneeIds.map(id => ({ id })),
    // Additional transformations
  }
}

export const transformApiToForm = (apiData: ApiTaskData): TaskFormData => {
  return {
    title: apiData.title,
    assigneeIds: apiData.assignees.map(a => a.id),
    // Additional transformations
  }
}
```

### Configuration Management

**File**: `/lib/config/board-config.ts`

```typescript
export const defaultBoardConfig: BoardConfiguration = {
  effortUnitType: 'points',
  itemValueOptions: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
}

export const getBoardConfig = (boardId: string): Promise<BoardConfiguration> => {
  // Fetch board-specific configuration
}
```

## Hooks for Reusability

### useTaskForm Hook

**File**: `/hooks/useTaskForm.ts`

```typescript
export const useTaskForm = (initialData?: Partial<TaskFormData>) => {
  const [formData, setFormData] = useState(defaultFormData)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  const validateForm = useCallback(() => {
    const result = validateTaskForm(formData)
    setErrors(result.errors)
    return result.isValid
  }, [formData])
  
  const submitForm = useCallback(async (apiEndpoint: string) => {
    if (!validateForm()) return false
    
    setIsLoading(true)
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformFormToApi(formData))
      })
      
      if (!response.ok) throw new Error('Submission failed')
      return true
    } catch (error) {
      console.error('Form submission error:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [formData, validateForm])
  
  return {
    formData,
    setFormData,
    errors,
    isLoading,
    validateForm,
    submitForm
  }
}
```

### useUsers Hook

**File**: `/hooks/useUsers.ts`

```typescript
export const useUsers = (projectId?: string, organizationId?: string) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = projectId 
        ? `/api/projects/${projectId}/members`
        : `/api/organizations/${organizationId}/members`
      
      const response = await fetch(endpoint)
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, organizationId])
  
  useEffect(() => {
    if (projectId || organizationId) {
      fetchUsers()
    }
  }, [fetchUsers])
  
  return { users, loading, refetch: fetchUsers }
}
```

## Integration Patterns

### Board View Integration

**Pattern**: Standardized task creation across board types

```typescript
// Shared integration component
const TaskCreationDialog = ({ 
  boardId, 
  projectId, 
  organizationId, 
  onSuccess 
}) => {
  const { users } = useUsers(projectId, organizationId)
  const { formData, setFormData, submitForm } = useTaskForm()
  
  const handleSubmit = async () => {
    const success = await submitForm('/api/tasks')
    if (success) {
      onSuccess?.()
    }
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <TaskForm
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          boardId={boardId}
          users={users}
        />
      </DialogContent>
    </Dialog>
  )
}
```

### API Integration

**Pattern**: Consistent API calling across components

```typescript
// Shared API service
export const taskService = {
  create: (data: TaskFormData) => 
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transformFormToApi(data))
    }),
    
  update: (id: string, data: Partial<TaskFormData>) =>
    fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transformFormToApi(data))
    })
}
```

## Best Practices

### Component Design

1. **Props Interface**: Always define clear TypeScript interfaces
2. **Default Props**: Provide sensible defaults for optional props
3. **Error Boundaries**: Wrap components in error boundaries
4. **Loading States**: Include loading state management
5. **Accessibility**: Implement ARIA labels and keyboard navigation

### State Management

1. **Local State**: Use for component-specific state
2. **Shared State**: Use context for cross-component state
3. **Server State**: Use SWR/React Query for API data
4. **Form State**: Use controlled components with validation

### Performance

1. **Memoization**: Use React.memo for expensive components
2. **Lazy Loading**: Implement code splitting where appropriate
3. **Virtualization**: Use for large lists
4. **Debouncing**: Implement for search and API calls

### Testing

1. **Unit Tests**: Test component logic in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **Visual Tests**: Test component appearance

## File Organization

```
/components
  /scrum              # Core reusable components
    TaskForm.tsx
    PerformersSelector.tsx
    EstimationSelector.tsx
    ItemTypeSelector.tsx
    CustomFieldsEditor.tsx
    LabelSelector.tsx
  /ui                 # Base UI components
  /boards             # Board-specific components
  /projects           # Project-specific components

/hooks                # Reusable hooks
  useTaskForm.ts
  useUsers.ts
  useBoardConfig.ts

/lib                  # Utility functions
  /validation
  /transforms
  /config

/types               # TypeScript type definitions
  task.ts
  user.ts
  board.ts
```

## Migration Guide

When refactoring existing components for reusability:

1. **Extract Props**: Move configuration to props
2. **Remove Dependencies**: Eliminate tight coupling
3. **Add Defaults**: Provide fallback values
4. **Test Integration**: Verify in multiple contexts
5. **Update Documentation**: Document new usage patterns

---

**Last Updated**: {current_date}
**Version**: 1.0.0
**Maintained By**: Development Team