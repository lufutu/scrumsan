# Permission System Documentation

## Overview

The Team Management system implements a comprehensive role-based access control (RBAC) system with support for custom permission sets. This document provides detailed information about how permissions work, how to configure them, and best practices for implementation.

## Architecture

### Permission Hierarchy

The permission system operates on multiple levels:

1. **Organization Level**: Base membership in an organization
2. **Role Level**: Default roles with predefined permissions
3. **Permission Set Level**: Custom permission configurations
4. **Resource Level**: Specific permissions on individual resources

### Permission Flow

```
User Request → Authentication → Organization Membership → Role/Permission Set → Resource Access
```

## Default Roles

### Owner
- **Description**: Complete control over the organization
- **Permissions**: All permissions enabled
- **Restrictions**: 
  - Cannot be modified by other users
  - Cannot be removed from organization
  - Can transfer ownership to another member

### Admin
- **Description**: Administrative access with broad permissions
- **Default Permissions**:
  - Team Members: View All ✓, Manage All ✓
  - Projects: View All ✓, Manage All ✓, View Assigned ✓, Manage Assigned ✓
  - Invoicing: View All ✓, Manage All ✓, View Assigned ✓, Manage Assigned ✓
  - Clients: View All ✓, Manage All ✓, View Assigned ✓, Manage Assigned ✓
  - Worklogs: Manage All ✓

### Member
- **Description**: Standard team member with limited permissions
- **Default Permissions**:
  - Team Members: View All ✗, Manage All ✗
  - Projects: View All ✗, Manage All ✗, View Assigned ✓, Manage Assigned ✗
  - Invoicing: View All ✗, Manage All ✗, View Assigned ✗, Manage Assigned ✗
  - Clients: View All ✗, Manage All ✗, View Assigned ✗, Manage Assigned ✗
  - Worklogs: Manage All ✗

### Guest
- **Description**: External collaborator with minimal access
- **Default Permissions**:
  - Team Members: View All ✗, Manage All ✗
  - Projects: View All ✗, Manage All ✗, View Assigned ✓, Manage Assigned ✗
  - Invoicing: View All ✗, Manage All ✗, View Assigned ✗, Manage Assigned ✗
  - Clients: View All ✗, Manage All ✗, View Assigned ✗, Manage Assigned ✗
  - Worklogs: Manage All ✗

## Custom Permission Sets

### Permission Categories

#### Team Members
- **View All Members**: Can see all organization members and their basic information
- **Manage All Members**: Can add, remove, and modify team member roles and permissions

#### Projects
- **View All Projects**: Can see all projects in the organization
- **Manage All Projects**: Can create, modify, and delete any project
- **View Assigned Projects**: Can see projects where the member is assigned
- **Manage Assigned Projects**: Can modify projects where the member has management rights

#### Invoicing
- **View All Invoicing**: Can see all invoicing data and financial information
- **Manage All Invoicing**: Can create, modify, and delete invoicing data
- **View Assigned Invoicing**: Can see invoicing data for assigned projects/clients
- **Manage Assigned Invoicing**: Can manage invoicing for assigned projects/clients

#### Clients
- **View All Clients**: Can see all client information and relationships
- **Manage All Clients**: Can create, modify, and delete client records
- **View Assigned Clients**: Can see clients assigned to the member
- **Manage Assigned Clients**: Can manage assigned client relationships

#### Worklogs
- **Manage All Worklogs**: Can view and modify all team member worklogs and time tracking

### Permission Dependencies

The system enforces logical dependencies between permissions:

- **Manage permissions require corresponding View permissions**
  - "Manage All Projects" requires "View All Projects"
  - "Manage Assigned Clients" requires "View Assigned Clients"
  - etc.

### Creating Custom Permission Sets

1. **Navigate to Permission Sets**: Go to Organization Settings → Permission Sets
2. **Create New Set**: Click "Create Permission Set"
3. **Configure Permissions**: Enable/disable permissions for each category
4. **Validate Dependencies**: System will check for required dependencies
5. **Save and Assign**: Save the set and assign to appropriate members

### Example Permission Sets

#### Project Manager
```json
{
  "name": "Project Manager",
  "permissions": {
    "teamMembers": {
      "viewAll": true,
      "manageAll": false
    },
    "projects": {
      "viewAll": true,
      "manageAll": true,
      "viewAssigned": true,
      "manageAssigned": true
    },
    "invoicing": {
      "viewAll": true,
      "manageAll": false,
      "viewAssigned": true,
      "manageAssigned": true
    },
    "clients": {
      "viewAll": true,
      "manageAll": false,
      "viewAssigned": true,
      "manageAssigned": true
    },
    "worklogs": {
      "manageAll": false
    }
  }
}
```

#### Finance Manager
```json
{
  "name": "Finance Manager",
  "permissions": {
    "teamMembers": {
      "viewAll": true,
      "manageAll": false
    },
    "projects": {
      "viewAll": true,
      "manageAll": false,
      "viewAssigned": true,
      "manageAssigned": false
    },
    "invoicing": {
      "viewAll": true,
      "manageAll": true,
      "viewAssigned": true,
      "manageAssigned": true
    },
    "clients": {
      "viewAll": true,
      "manageAll": true,
      "viewAssigned": true,
      "manageAssigned": true
    },
    "worklogs": {
      "manageAll": true
    }
  }
}
```

#### Team Lead
```json
{
  "name": "Team Lead",
  "permissions": {
    "teamMembers": {
      "viewAll": true,
      "manageAll": false
    },
    "projects": {
      "viewAll": false,
      "manageAll": false,
      "viewAssigned": true,
      "manageAssigned": true
    },
    "invoicing": {
      "viewAll": false,
      "manageAll": false,
      "viewAssigned": false,
      "manageAssigned": false
    },
    "clients": {
      "viewAll": false,
      "manageAll": false,
      "viewAssigned": true,
      "manageAssigned": false
    },
    "worklogs": {
      "manageAll": false
    }
  }
}
```

## Permission Checking

### Client-Side Permission Checking

```typescript
import { hasPermission } from '@/lib/permission-utils'

// Check if user can manage all team members
const canManageMembers = hasPermission(
  userRole,
  permissionSet,
  'teamMembers.manageAll'
)

// Check with member context
const canManageProjects = hasPermissionWithContext(
  member,
  'projects.manageAll'
)
```

### Server-Side Permission Validation

```typescript
import { validatePermission } from '@/lib/permission-utils'

// Validate permission in API route
const { hasPermission, member, error } = await validatePermission(
  userId,
  organizationId,
  'teamMembers.manageAll'
)

if (!hasPermission) {
  return NextResponse.json({ error }, { status: 403 })
}
```

### Resource-Level Permission Checking

```typescript
import { canPerformAction } from '@/lib/permission-utils'

// Check if user can update a specific project
const canUpdate = canPerformAction(
  member,
  'update',
  'project',
  { isAssigned: true }
)
```

## Security Considerations

### Permission Enforcement

1. **Server-Side Validation**: All API endpoints validate permissions server-side
2. **Client-Side Hiding**: UI elements are hidden based on permissions for better UX
3. **Resource-Level Checks**: Permissions are checked at the resource level for fine-grained control

### Audit Logging

All permission-related actions are logged:

```typescript
import { logAuditEvent } from '@/lib/permission-utils'

await logAuditEvent(
  organizationId,
  userId,
  'permission.set.updated',
  'permission_set',
  permissionSetId,
  { oldPermissions, newPermissions },
  { ip: request.ip, userAgent: request.headers['user-agent'] }
)
```

### Input Sanitization

All user inputs are sanitized to prevent security vulnerabilities:

```typescript
import { sanitizeInput, sanitizeObject } from '@/lib/permission-utils'

const sanitizedName = sanitizeInput(permissionSetName)
const sanitizedData = sanitizeObject(requestData)
```

### Rate Limiting

Permission-related operations are rate-limited:

```typescript
import { checkRateLimit } from '@/lib/permission-utils'

const { allowed, remaining, resetTime } = checkRateLimit(
  `permission-check:${userId}`,
  100, // max requests
  60000 // window in ms
)

if (!allowed) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  )
}
```

## Best Practices

### Permission Set Design

1. **Principle of Least Privilege**: Grant only the minimum permissions needed
2. **Role-Based Grouping**: Create permission sets based on job functions
3. **Regular Review**: Periodically review and update permission sets
4. **Clear Naming**: Use descriptive names for permission sets

### Implementation Guidelines

1. **Always Validate Server-Side**: Never rely solely on client-side permission checks
2. **Use Specific Permissions**: Check for specific permissions rather than roles
3. **Handle Edge Cases**: Account for edge cases like ownership transfer
4. **Provide Clear Feedback**: Give users clear feedback when permissions are denied

### Common Patterns

#### Permission-Based Component Rendering

```typescript
import { PermissionGuard } from '@/components/common/PermissionGuard'

<PermissionGuard permission="teamMembers.manageAll">
  <AddMemberButton />
</PermissionGuard>
```

#### Conditional API Access

```typescript
// In API route
if (!hasPermission(member.role, member.permissionSet?.permissions, 'projects.manageAll')) {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  )
}
```

#### Dynamic Menu Generation

```typescript
const menuItems = [
  {
    label: 'Team Members',
    href: '/team',
    permission: 'teamMembers.viewAll'
  },
  {
    label: 'Projects',
    href: '/projects',
    permission: 'projects.viewAll'
  }
].filter(item => hasPermission(userRole, permissionSet, item.permission))
```

## Troubleshooting

### Common Issues

#### Permission Dependencies Not Met
**Problem**: User gets validation error when creating permission set
**Solution**: Ensure all required dependencies are enabled (e.g., manage requires view)

#### User Can't Access Expected Resources
**Problem**: User with custom permission set can't access resources they should be able to
**Solution**: 
1. Check if permission set is correctly assigned
2. Verify permission dependencies are met
3. Check for resource-level assignment requirements

#### Inconsistent Permission Behavior
**Problem**: Permissions work in some areas but not others
**Solution**:
1. Verify both client-side and server-side permission checks are implemented
2. Check for caching issues with permission data
3. Ensure permission checks use the same logic

### Debugging Tools

#### Permission Checker Utility

```typescript
// Debug permission checking
console.log('Permission Check:', {
  user: userId,
  role: userRole,
  permissionSet: permissionSet?.name,
  permission: 'teamMembers.manageAll',
  result: hasPermission(userRole, permissionSet?.permissions, 'teamMembers.manageAll')
})
```

#### Audit Log Analysis

```typescript
// Get recent permission-related audit logs
const logs = await getAuditLogs(organizationId, userId, {
  resourceType: 'permission_set',
  limit: 50
})
```

## Migration and Updates

### Updating Permission Sets

When updating the permission system:

1. **Backup Current Permissions**: Export current permission configurations
2. **Test Changes**: Test permission changes in a staging environment
3. **Gradual Rollout**: Update permissions gradually, not all at once
4. **Monitor Impact**: Monitor audit logs for unexpected permission denials
5. **Rollback Plan**: Have a plan to rollback changes if issues arise

### Adding New Permissions

When adding new permission types:

1. **Update Schema**: Add new permissions to the permission configuration schema
2. **Update Validation**: Update permission dependency validation
3. **Update UI**: Add new permission controls to the UI
4. **Update Documentation**: Update this documentation and help text
5. **Migrate Existing Sets**: Update existing permission sets with default values

## API Reference

See the [Team Management API Documentation](./team-management-api.md) for detailed API reference including:

- Permission set CRUD operations
- Member permission management
- Audit log access
- Permission validation endpoints

## Support

For additional support with the permission system:

- **Documentation**: Refer to inline help text and tooltips in the application
- **API Reference**: Use the comprehensive API documentation
- **Audit Logs**: Check audit logs for permission-related issues
- **Support Team**: Contact the development team for complex permission scenarios