# Error Handling Improvement Design

## Overview

This design outlines the systematic replacement of thrown errors with user-friendly toast notifications throughout the application. The goal is to improve user experience by providing helpful feedback instead of crashing the application.

## Architecture

### Error Handling Strategy

1. **User-Facing Components**: Replace thrown errors with toast.error messages
2. **Hooks and Utilities**: Show toast.error but don't throw (let React Query handle retries)
3. **API Utilities**: Log errors and return meaningful error objects
4. **Critical System Functions**: Keep throwing errors but add logging

### Error Message Categories

1. **Network Errors**: Connection issues, timeouts
2. **Validation Errors**: Invalid input, missing required fields
3. **Permission Errors**: Access denied, insufficient privileges
4. **Business Logic Errors**: Conflicts, invalid operations
5. **System Errors**: Configuration issues, service unavailable

### Implementation Pattern

```typescript
// BEFORE - Throwing errors
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Operation failed')
  }
} catch (error) {
  // Error crashes the component or gets caught by error boundary
}

// AFTER - Toast notifications
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    const error = await response.json()
    const message = error.error || 'Operation failed'
    console.error('API Error:', message, error)
    toast.error(message)
    return // Exit gracefully
  }
} catch (error) {
  console.error('Network Error:', error)
  toast.error('Network error. Please check your connection and try again.')
  return // Exit gracefully
}
```

## Components

### Error Message Utility

Create a centralized error message utility:

```typescript
// lib/error-messages.ts
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'error' in error) {
    return (error as any).error
  }
  return fallback
}

export const showErrorToast = (error: unknown, fallback: string) => {
  const message = getErrorMessage(error, fallback)
  console.error('Error:', message, error)
  toast.error(message)
}
```

### Error Categories

1. **Network Errors**
   - Connection timeouts
   - Server unavailable
   - DNS resolution failures

2. **API Errors**
   - 400 Bad Request
   - 401 Unauthorized
   - 403 Forbidden
   - 404 Not Found
   - 500 Internal Server Error

3. **Validation Errors**
   - Missing required fields
   - Invalid format
   - Business rule violations

4. **Permission Errors**
   - Insufficient privileges
   - Resource access denied
   - Organization membership required

## Data Models

### Error Response Format

```typescript
interface ApiErrorResponse {
  error: string
  details?: string
  code?: string
  field?: string
}
```

### Error Context

```typescript
interface ErrorContext {
  operation: string
  resource: string
  userId?: string
  organizationId?: string
  timestamp: Date
}
```

## Error Handling

### Component Level

```typescript
const handleOperation = async () => {
  try {
    setLoading(true)
    const result = await performOperation()
    toast.success('Operation completed successfully')
    return result
  } catch (error) {
    showErrorToast(error, 'Operation failed')
  } finally {
    setLoading(false)
  }
}
```

### Hook Level

```typescript
const useApiOperation = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Operation failed')
      }
      
      return response.json()
    },
    onError: (error) => {
      showErrorToast(error, 'Operation failed')
    },
    onSuccess: () => {
      toast.success('Operation completed successfully')
    }
  })
}
```

## Testing Strategy

### Error Scenarios

1. **Network Failures**
   - Offline mode
   - Slow connections
   - Server timeouts

2. **API Errors**
   - Invalid requests
   - Authentication failures
   - Permission denials

3. **Validation Errors**
   - Form validation
   - Business rule violations
   - Data conflicts

### Test Cases

```typescript
describe('Error Handling', () => {
  it('should show toast on network error', async () => {
    // Mock network failure
    // Trigger operation
    // Verify toast.error was called
    // Verify component remains functional
  })
  
  it('should show toast on API error', async () => {
    // Mock API error response
    // Trigger operation
    // Verify toast.error with correct message
    // Verify error is logged
  })
})
```

## Migration Plan

### Phase 1: Critical User-Facing Components
- InvitationAcceptPage
- Project board operations
- Team management operations

### Phase 2: Hooks and Utilities
- useTeamMembers
- useSprints
- useBoards
- useProjects

### Phase 3: System Utilities
- AWS S3 operations
- Authentication utilities
- Storage utilities

### Phase 4: API Routes (if needed)
- Error response formatting
- Consistent error codes
- Proper HTTP status codes