# Enhanced Item Details Documentation

## Overview

This document describes the Enhanced Item Details system - a comprehensive task management feature inspired by modern project management tools. The system provides advanced task creation and management capabilities with multiple assignees, business value tracking, and custom fields.

## Features

### 1. Multiple Assignees & Reviewers
- **Multiple Assignees**: Tasks can have multiple people assigned to work on them
- **Multiple Reviewers**: Tasks can have dedicated reviewers for quality control
- **Quick Assignment**: "Assign to myself" option for rapid self-assignment
- **User Search**: Real-time search functionality for finding team members

### 2. Item Value & ROI Calculation
- **Business Value Sizing**: Separate from effort estimation (XS, S, M, L, XL, XXL)
- **Effort Units**: Alternative to story points with configurable units (hours, custom)
- **Automatic ROI**: Real-time calculation of Return on Investment (Value/Effort)
- **Estimation Types**: Toggle between story points and effort units

### 3. Six Item Types
- **Story**: New functionality being created
- **Improvement**: Enhancements to existing functionality
- **Bug**: Errors, flaws, and failures
- **Task**: Technical work not covered by other types
- **Note**: Valuable or relevant information
- **Idea**: Thoughts for product improvement (needs additional work)

### 4. Custom Fields System
- **Text Fields**: Custom text inputs with validation
- **Numeric Fields**: Number inputs with min/max validation
- **Required Fields**: Configurable required field validation
- **Board Configuration**: Custom fields configured per board

### 5. Enhanced Labels
- **Color-coded Labels**: Visual organization with custom colors
- **Epic Tracking**: Labels can function as Epics for large work items
- **Auto-creation**: Labels created automatically if they don't exist
- **Board-level Management**: Labels managed at the board level

## Architecture

### Database Schema

The system uses a normalized database structure:

```
Task (Main entity)
├── TaskAssignee (Many-to-many with Users)
├── TaskReviewer (Many-to-many with Users) 
├── TaskLabel (Many-to-many with Labels)
├── TaskCustomFieldValue (Many-to-many with CustomFields)
└── BoardConfiguration (Board-level settings)
```

### Component Structure

```
TaskForm (Reusable form component)
├── ItemTypeSelector
├── PerformersSelector
├── EstimationSelector
├── LabelSelector
└── CustomFieldsEditor
```

### API Integration

- **POST /api/tasks**: Create tasks with enhanced details
- **PATCH /api/tasks/:id**: Update task details
- **GET /api/boards/:id/labels**: Manage board labels
- **Validation**: Zod schema validation for all fields

## Implementation Details

### TaskForm Component

**Location**: `/components/scrum/TaskForm.tsx`

**Props**:
```typescript
interface TaskFormProps {
  formData: TaskFormData
  onFormDataChange: (data: TaskFormData) => void
  onSubmit: () => void
  onCancel: () => void
  boardId?: string
  users?: Array<{ id: string; fullName: string; email: string }>
  currentUserId?: string
  customFields?: CustomField[]
  boardConfig?: BoardConfiguration
  isLoading?: boolean
  submitLabel?: string
}
```

**Features**:
- Form validation with required field checking
- Real-time ROI calculation
- Dynamic custom field rendering
- User search and selection
- Label management

### PerformersSelector Component

**Location**: `/components/scrum/PerformersSelector.tsx`

**Features**:
- Dual selection for assignees and reviewers
- "Assign to myself" quick action
- Real-time user search
- Multi-select with visual indicators

### EstimationSelector Component

**Location**: `/components/scrum/EstimationSelector.tsx`

**Features**:
- Item Value selection (XS-XXL scale)
- Effort Units with story points/hours/custom options
- Automatic ROI calculation and display
- Estimation type toggle (story points vs effort units)

### ItemTypeSelector Component

**Location**: `/components/scrum/ItemTypeSelector.tsx`

**Features**:
- Six distinct item types with icons
- Detailed descriptions for each type
- Visual differentiation with colors
- Dropdown selection with preview

### CustomFieldsEditor Component

**Location**: `/components/scrum/CustomFieldsEditor.tsx`

**Features**:
- Dynamic field rendering based on type
- Text and numeric field validation
- Required field indicators
- Min/max value validation for numeric fields

## Usage Examples

### Basic Task Creation

```typescript
const [formData, setFormData] = useState<TaskFormData>(defaultFormData)

return (
  <TaskForm
    formData={formData}
    onFormDataChange={setFormData}
    onSubmit={handleCreateTask}
    onCancel={() => setDialogOpen(false)}
    boardId={boardId}
    users={users}
    currentUserId={user?.id}
    isLoading={isLoading}
  />
)
```

### With Custom Fields

```typescript
const customFields = [
  {
    id: 'field1',
    name: 'Business Priority',
    fieldType: 'numeric',
    minValue: 1,
    maxValue: 10,
    isRequired: true
  }
]

return (
  <TaskForm
    // ... other props
    customFields={customFields}
    boardConfig={{
      effortUnitType: 'hours',
      itemValueOptions: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }}
  />
)
```

## Integration Points

### Board Views

The enhanced task form is integrated into:
- **Product Backlog**: Full-featured task creation
- **Standalone Boards**: Organization-level task management
- **Project Boards**: Project-specific task creation

### API Endpoints

All board views use the same API endpoints:
- Consistent data structure
- Unified validation
- Shared business logic

### Data Flow

1. User fills out enhanced form
2. Frontend validates required fields
3. API receives structured data
4. Database relationships created atomically
5. Success/error feedback to user

## Configuration

### Board Configuration

```typescript
interface BoardConfiguration {
  effortUnitType: 'points' | 'hours' | 'custom'
  effortUnitName?: string
  itemValueOptions: string[]
}
```

### Custom Fields

```typescript
interface CustomField {
  id: string
  name: string
  fieldType: 'text' | 'numeric'
  defaultValue?: string
  minValue?: number
  maxValue?: number
  isRequired: boolean
  position: number
}
```

## Performance Considerations

- **Lazy Loading**: Components load only when needed
- **Efficient Queries**: Minimal database calls with proper joins
- **Caching**: SWR caching for user lists and board data
- **Optimistic Updates**: UI updates before API confirmation

## Testing

### Unit Tests
- Component rendering
- Form validation
- ROI calculation logic
- Custom field validation

### Integration Tests
- API endpoint testing
- Database relationship creation
- Error handling scenarios

### User Acceptance Tests
- Task creation workflows
- Multi-user assignment scenarios
- Custom field functionality

## Future Enhancements

### Planned Features
- **Advanced Custom Fields**: Date, dropdown, multi-select types
- **Field Dependencies**: Conditional field visibility
- **Templates**: Pre-configured task templates
- **Bulk Operations**: Multi-task editing capabilities

### Scalability
- **Performance Optimization**: Query optimization for large teams
- **Advanced Search**: Full-text search across all fields
- **Export/Import**: Data portability features

## Maintenance

### Regular Updates
- Keep documentation synchronized with code changes
- Update examples when API changes
- Review and update performance metrics
- Validate against latest dependencies

### Monitoring
- Track task creation success rates
- Monitor API response times
- User adoption metrics
- Error rate analysis

---

**Last Updated**: {current_date}
**Version**: 1.0.0
**Maintained By**: Development Team