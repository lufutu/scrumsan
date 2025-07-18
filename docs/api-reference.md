# API Reference Documentation

## Overview

This document provides comprehensive API reference for the task management system, including endpoints, request/response formats, and integration examples.

## Base URL

All API endpoints are relative to the application base URL:
```
Base URL: /api
```

## Authentication

All API endpoints require authentication via session-based auth. The current user is determined from the session.

## Common Response Format

### Success Response
```json
{
  "data": {},
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Tasks API

### Create Task

**Endpoint**: `POST /api/tasks`

**Description**: Creates a new task with enhanced item details

**Request Body**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "taskType": "story | improvement | bug | task | note | idea",
  "priority": "low | medium | high | critical",
  "storyPoints": "number (optional)",
  "effortUnits": "number (optional)",
  "estimationType": "story_points | effort_units",
  "itemValue": "XS | S | M | L | XL | XXL",
  "status": "backlog | sprint | followup",
  "assignees": [
    {
      "id": "string",
      "fullName": "string",
      "email": "string"
    }
  ],
  "reviewers": [
    {
      "id": "string", 
      "fullName": "string",
      "email": "string"
    }
  ],
  "labels": [
    {
      "id": "string",
      "name": "string",
      "color": "string"
    }
  ],
  "customFieldValues": [
    {
      "customFieldId": "string",
      "value": "string"
    }
  ],
  "boardId": "string (optional)",
  "projectId": "string (optional)",
  "dueDate": "string (ISO date, optional)"
}
```

**Response**:
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "taskType": "string",
  "priority": "string",
  "storyPoints": "number",
  "effortUnits": "number",
  "estimationType": "string",
  "itemValue": "string",
  "status": "string",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)",
  "assignee": {
    "id": "string",
    "fullName": "string",
    "avatarUrl": "string"
  },
  "creator": {
    "id": "string", 
    "fullName": "string",
    "avatarUrl": "string"
  },
  "board": {
    "id": "string",
    "name": "string"
  },
  "_count": {
    "comments": "number",
    "attachments": "number",
    "subtasks": "number"
  }
}
```

**Example Request**:
```bash
curl -X POST /api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add login and registration functionality",
    "taskType": "story",
    "priority": "high", 
    "storyPoints": 8,
    "itemValue": "L",
    "assignees": [
      {
        "id": "user-123",
        "fullName": "John Doe",
        "email": "john@example.com"
      }
    ],
    "boardId": "board-456"
  }'
```

### Update Task

**Endpoint**: `PATCH /api/tasks/{taskId}`

**Description**: Updates an existing task

**Request Body**: Same as create task (all fields optional)

**Response**: Updated task object

### Get Tasks

**Endpoint**: `GET /api/tasks`

**Description**: Retrieves tasks with filtering options

**Query Parameters**:
- `boardId` (string, optional): Filter by board
- `projectId` (string, optional): Filter by project
- `assigneeId` (string, optional): Filter by assignee
- `status` (string, optional): Filter by status

**Response**:
```json
[
  {
    "id": "uuid",
    "title": "string",
    // ... full task object
  }
]
```

### Delete Task

**Endpoint**: `DELETE /api/tasks/{taskId}`

**Description**: Deletes a task

**Response**: 
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

## Labels API

### Get Board Labels

**Endpoint**: `GET /api/boards/{boardId}/labels`

**Description**: Retrieves all labels for a board with statistics

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "string",
    "color": "string",
    "description": "string",
    "statistics": {
      "taskCount": "number",
      "totalPoints": "number",
      "assigneeCount": "number",
      "loggedTime": "number"
    }
  }
]
```

### Create Label

**Endpoint**: `POST /api/boards/{boardId}/labels`

**Description**: Creates a new label for a board

**Request Body**:
```json
{
  "name": "string (required)",
  "color": "string (required)",
  "description": "string (optional)"
}
```

### Update Label

**Endpoint**: `PUT /api/boards/{boardId}/labels/{labelId}`

**Description**: Updates a label

**Request Body**: Same as create label

### Delete Label

**Endpoint**: `DELETE /api/boards/{boardId}/labels/{labelId}`

**Description**: Deletes a label

## Boards API

### Get Boards

**Endpoint**: `GET /api/boards`

**Description**: Retrieves boards for the authenticated user

**Query Parameters**:
- `organizationId` (string, optional): Filter by organization
- `projectId` (string, optional): Filter by project

### Create Board

**Endpoint**: `POST /api/boards`

**Request Body**:
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "boardType": "scrum | kanban",
  "projectId": "string (optional)",
  "organizationId": "string (required if no projectId)"
}
```

## Projects API

### Get Project Members

**Endpoint**: `GET /api/projects/{projectId}/members`

**Description**: Retrieves members of a project

**Response**:
```json
[
  {
    "id": "string",
    "fullName": "string",
    "email": "string",
    "avatarUrl": "string",
    "role": "string"
  }
]
```

## Organizations API

### Get Organization Members

**Endpoint**: `GET /api/organizations/{organizationId}/members`

**Description**: Retrieves members of an organization

**Response**: Same as project members

## Sprints API

### Get Sprints

**Endpoint**: `GET /api/sprints`

**Query Parameters**:
- `boardId` (string, optional): Filter by board
- `projectId` (string, optional): Filter by project

### Create Sprint

**Endpoint**: `POST /api/sprints`

**Request Body**:
```json
{
  "name": "string (required)",
  "goal": "string (optional)", 
  "startDate": "string (ISO date, optional)",
  "endDate": "string (ISO date, optional)",
  "boardId": "string (required)",
  "projectId": "string (optional)"
}
```

### Update Sprint

**Endpoint**: `PATCH /api/sprints/{sprintId}`

### Add Task to Sprint

**Endpoint**: `POST /api/sprints/{sprintId}/tasks`

**Request Body**:
```json
{
  "taskId": "string (required)"
}
```

## Custom Fields API

### Get Board Custom Fields

**Endpoint**: `GET /api/boards/{boardId}/custom-fields`

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "fieldType": "text | numeric",
    "defaultValue": "string",
    "minValue": "number",
    "maxValue": "number", 
    "isRequired": "boolean",
    "position": "number"
  }
]
```

### Create Custom Field

**Endpoint**: `POST /api/boards/{boardId}/custom-fields`

**Request Body**:
```json
{
  "name": "string (required)",
  "fieldType": "text | numeric (required)",
  "defaultValue": "string (optional)",
  "minValue": "number (optional)",
  "maxValue": "number (optional)",
  "isRequired": "boolean (optional)",
  "position": "number (optional)"
}
```

## Error Codes

### Common Error Codes

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `DUPLICATE_ENTRY`: Resource already exists
- `INTERNAL_ERROR`: Server error

### Task-Specific Error Codes

- `TASK_NOT_FOUND`: Task with given ID not found
- `INVALID_ASSIGNEE`: Assignee not found or not authorized
- `INVALID_BOARD`: Board not found or access denied
- `INVALID_CUSTOM_FIELD`: Custom field validation failed

### Board-Specific Error Codes

- `BOARD_NOT_FOUND`: Board not found
- `LABEL_ALREADY_EXISTS`: Label name already exists on board
- `CUSTOM_FIELD_LIMIT`: Maximum custom fields exceeded

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **Heavy operations** (bulk updates): 10 requests per minute per user
- **File uploads**: 5 requests per minute per user

Headers included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Time when limit resets

## Pagination

For endpoints returning lists, pagination is handled via query parameters:

**Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 50, max: 100): Items per page
- `sortBy` (string, optional): Sort field
- `sortOrder` (asc|desc, default: asc): Sort direction

**Response Headers**:
- `X-Total-Count`: Total number of items
- `X-Page-Count`: Total number of pages
- `X-Current-Page`: Current page number

## Webhooks

### Available Events

- `task.created`: Task created
- `task.updated`: Task updated  
- `task.assigned`: Task assigned to user
- `task.completed`: Task marked as completed
- `sprint.started`: Sprint started
- `sprint.completed`: Sprint completed

### Webhook Payload

```json
{
  "event": "string",
  "timestamp": "string (ISO date)",
  "data": {
    // Event-specific data
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Task creation
const task = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'New task',
    taskType: 'story',
    assignees: [{ id: 'user-123' }]
  })
})

// Error handling
if (!task.ok) {
  const error = await task.json()
  console.error('Task creation failed:', error.error)
}
```

### React Hook Example

```typescript
const useCreateTask = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const createTask = async (taskData: TaskFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }
      
      return await response.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  return { createTask, loading, error }
}
```

## Testing

### Test Data

Use these endpoints in development/test environments:

- `POST /api/test/seed-data`: Creates test tasks and users
- `DELETE /api/test/cleanup`: Removes all test data

### Example Test Cases

```javascript
describe('Tasks API', () => {
  it('should create task with enhanced details', async () => {
    const taskData = {
      title: 'Test task',
      taskType: 'story',
      storyPoints: 5,
      itemValue: 'M',
      assignees: [{ id: 'test-user' }]
    }
    
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    
    expect(response.status).toBe(200)
    const task = await response.json()
    expect(task.title).toBe(taskData.title)
    expect(task.storyPoints).toBe(taskData.storyPoints)
  })
})
```

---

**Last Updated**: {current_date}
**Version**: 1.0.0
**Maintained By**: Development Team