# Team Management API Documentation

## Overview

The Team Management API provides comprehensive endpoints for managing organization members, permissions, engagements, time-off, and profiles. All endpoints require proper authentication and authorization.

## Base URL

All API endpoints are prefixed with `/api/organizations/{organizationId}/`

## Authentication

All endpoints require a valid session token. The user must be a member of the organization with appropriate permissions.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)",
  "code": "ERROR_CODE (optional)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## Organization Members

### List Organization Members

**GET** `/api/organizations/{organizationId}/members`

Retrieve a list of organization members with optional filtering.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `roles` | string[] | Filter by member roles (owner, admin, member, guest) |
| `projects` | string[] | Filter by assigned project IDs |
| `minHours` | number | Minimum working hours per week |
| `maxHours` | number | Maximum working hours per week |
| `minAvailability` | number | Minimum available hours per week |
| `maxAvailability` | number | Maximum available hours per week |
| `permissions` | string[] | Filter by permission types |
| `search` | string | Search in names, emails, or job titles |
| `limit` | number | Number of results per page (for pagination) |
| `page` | number | Page number (for pagination) |

#### Response

```json
{
  "members": [
    {
      "id": "member-uuid",
      "organizationId": "org-uuid",
      "userId": "user-uuid",
      "role": "admin",
      "permissionSetId": "permission-set-uuid",
      "jobTitle": "Senior Developer",
      "workingHoursPerWeek": 40,
      "joinDate": "2024-01-15",
      "createdAt": "2024-01-15T10:00:00Z",
      "user": {
        "id": "user-uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "permissionSet": {
        "id": "permission-set-uuid",
        "name": "Developer",
        "permissions": { /* permission config */ }
      },
      "engagements": [
        {
          "id": "engagement-uuid",
          "projectId": "project-uuid",
          "role": "Lead Developer",
          "hoursPerWeek": 30,
          "startDate": "2024-01-15",
          "endDate": null,
          "isActive": true,
          "project": {
            "id": "project-uuid",
            "name": "Project Alpha"
          }
        }
      ],
      "timeOffEntries": [
        {
          "id": "timeoff-uuid",
          "type": "vacation",
          "startDate": "2024-06-01",
          "endDate": "2024-06-07",
          "description": "Summer vacation",
          "status": "approved"
        }
      ],
      "profileData": {
        "id": "profile-uuid",
        "secondaryEmail": "john.personal@example.com",
        "phone": "+1234567890",
        "linkedin": "https://linkedin.com/in/johndoe",
        "visibility": {
          "phone": "admin",
          "linkedin": "member"
        }
      }
    }
  ],
  "total": 25,
  "hasMore": true,
  "nextCursor": "cursor-string"
}
```

#### Required Permissions
- `teamMembers.viewAll` - To view all members
- Default: Can only view own profile

### Add Organization Member

**POST** `/api/organizations/{organizationId}/members`

Add a new member to the organization or send an invitation.

#### Request Body

```json
{
  "email": "newmember@example.com",
  "role": "member",
  "permissionSetId": "permission-set-uuid",
  "jobTitle": "Developer",
  "workingHoursPerWeek": 40
}
```

#### Response

```json
{
  "id": "member-uuid",
  "organizationId": "org-uuid",
  "userId": "user-uuid",
  "role": "member",
  "permissionSetId": "permission-set-uuid",
  "jobTitle": "Developer",
  "workingHoursPerWeek": 40,
  "joinDate": "2024-01-15",
  "createdAt": "2024-01-15T10:00:00Z",
  "user": {
    "id": "user-uuid",
    "fullName": "New Member",
    "email": "newmember@example.com",
    "avatarUrl": null
  },
  "invitationSent": true
}
```

#### Required Permissions
- `teamMembers.manageAll`

### Get Member Details

**GET** `/api/organizations/{organizationId}/members/{memberId}`

Retrieve detailed information about a specific member.

#### Response

```json
{
  "id": "member-uuid",
  "organizationId": "org-uuid",
  "userId": "user-uuid",
  "role": "admin",
  "permissionSetId": "permission-set-uuid",
  "jobTitle": "Senior Developer",
  "workingHoursPerWeek": 40,
  "joinDate": "2024-01-15",
  "createdAt": "2024-01-15T10:00:00Z",
  "user": { /* user details */ },
  "permissionSet": { /* permission set details */ },
  "engagements": [ /* engagement details */ ],
  "timeOffEntries": [ /* time-off details */ ],
  "profileData": { /* profile details */ }
}
```

#### Required Permissions
- `teamMembers.viewAll` - To view any member
- Default: Can view own profile

### Update Member

**PUT** `/api/organizations/{organizationId}/members/{memberId}`

Update member information including role, permissions, and basic details.

#### Request Body

```json
{
  "role": "admin",
  "permissionSetId": "new-permission-set-uuid",
  "jobTitle": "Lead Developer",
  "workingHoursPerWeek": 35,
  "joinDate": "2024-01-15"
}
```

#### Response

```json
{
  "id": "member-uuid",
  "organizationId": "org-uuid",
  "userId": "user-uuid",
  "role": "admin",
  "permissionSetId": "new-permission-set-uuid",
  "jobTitle": "Lead Developer",
  "workingHoursPerWeek": 35,
  "joinDate": "2024-01-15",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

#### Required Permissions
- `teamMembers.manageAll`

### Remove Member

**DELETE** `/api/organizations/{organizationId}/members/{memberId}`

Remove a member from the organization with optional board removal.

#### Request Body

```json
{
  "boardIds": ["board-uuid-1", "board-uuid-2"]
}
```

#### Response

```json
{
  "success": true,
  "removedFromBoards": ["board-uuid-1", "board-uuid-2"],
  "message": "Member removed successfully"
}
```

#### Required Permissions
- `teamMembers.manageAll`

## Member Profiles

### Get Member Profile

**GET** `/api/organizations/{organizationId}/members/{memberId}/profile`

Retrieve detailed profile information for a member.

#### Response

```json
{
  "id": "profile-uuid",
  "organizationMemberId": "member-uuid",
  "secondaryEmail": "john.personal@example.com",
  "address": "123 Main St, City, State",
  "phone": "+1234567890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "skype": "john.doe.skype",
  "twitter": "@johndoe",
  "birthday": "1990-05-15",
  "maritalStatus": "married",
  "family": "Spouse: Jane, Children: 2",
  "other": "Additional notes",
  "visibility": {
    "secondaryEmail": "admin",
    "address": "admin",
    "phone": "admin",
    "linkedin": "member",
    "skype": "member",
    "twitter": "member",
    "birthday": "admin",
    "maritalStatus": "admin",
    "family": "admin",
    "other": "member"
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

#### Required Permissions
- Field visibility depends on profile settings and user role
- Admins can view admin-level fields
- Members can view member-level fields

### Update Member Profile

**PUT** `/api/organizations/{organizationId}/members/{memberId}/profile`

Update member profile information and visibility settings.

#### Request Body

```json
{
  "secondaryEmail": "john.updated@example.com",
  "address": "456 New St, City, State",
  "phone": "+1234567891",
  "linkedin": "https://linkedin.com/in/johnupdated",
  "skype": "john.updated.skype",
  "twitter": "@johnupdated",
  "birthday": "1990-05-15",
  "maritalStatus": "married",
  "family": "Updated family info",
  "other": "Updated additional notes",
  "visibility": {
    "secondaryEmail": "member",
    "address": "admin",
    "phone": "admin",
    "linkedin": "member",
    "skype": "member",
    "twitter": "member",
    "birthday": "admin",
    "maritalStatus": "admin",
    "family": "admin",
    "other": "member"
  }
}
```

#### Response

```json
{
  "id": "profile-uuid",
  "organizationMemberId": "member-uuid",
  "secondaryEmail": "john.updated@example.com",
  "address": "456 New St, City, State",
  "phone": "+1234567891",
  "linkedin": "https://linkedin.com/in/johnupdated",
  "skype": "john.updated.skype",
  "twitter": "@johnupdated",
  "birthday": "1990-05-15",
  "maritalStatus": "married",
  "family": "Updated family info",
  "other": "Updated additional notes",
  "visibility": {
    "secondaryEmail": "member",
    "address": "admin",
    "phone": "admin",
    "linkedin": "member",
    "skype": "member",
    "twitter": "member",
    "birthday": "admin",
    "maritalStatus": "admin",
    "family": "admin",
    "other": "member"
  },
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

#### Required Permissions
- Members can update their own profile
- `teamMembers.manageAll` - To update any member's profile

## Project Engagements

### List Member Engagements

**GET** `/api/organizations/{organizationId}/members/{memberId}/engagements`

Retrieve all project engagements for a member.

#### Response

```json
{
  "engagements": [
    {
      "id": "engagement-uuid",
      "organizationMemberId": "member-uuid",
      "projectId": "project-uuid",
      "role": "Lead Developer",
      "hoursPerWeek": 30,
      "startDate": "2024-01-15",
      "endDate": null,
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "project": {
        "id": "project-uuid",
        "name": "Project Alpha",
        "description": "Main project description"
      }
    }
  ],
  "totalHours": 30,
  "availableHours": 10
}
```

### Add Member Engagement

**POST** `/api/organizations/{organizationId}/members/{memberId}/engagements`

Add a new project engagement for a member.

#### Request Body

```json
{
  "projectId": "project-uuid",
  "role": "Developer",
  "hoursPerWeek": 20,
  "startDate": "2024-02-01",
  "endDate": "2024-06-01",
  "isActive": true
}
```

#### Response

```json
{
  "id": "engagement-uuid",
  "organizationMemberId": "member-uuid",
  "projectId": "project-uuid",
  "role": "Developer",
  "hoursPerWeek": 20,
  "startDate": "2024-02-01",
  "endDate": "2024-06-01",
  "isActive": true,
  "createdAt": "2024-01-20T10:00:00Z",
  "project": {
    "id": "project-uuid",
    "name": "Project Beta"
  }
}
```

#### Required Permissions
- `projects.manageAll` or `projects.manageAssigned`

### Update Engagement

**PUT** `/api/organizations/{organizationId}/members/{memberId}/engagements/{engagementId}`

Update an existing project engagement.

#### Request Body

```json
{
  "role": "Senior Developer",
  "hoursPerWeek": 25,
  "endDate": "2024-07-01",
  "isActive": true
}
```

#### Response

```json
{
  "id": "engagement-uuid",
  "organizationMemberId": "member-uuid",
  "projectId": "project-uuid",
  "role": "Senior Developer",
  "hoursPerWeek": 25,
  "startDate": "2024-02-01",
  "endDate": "2024-07-01",
  "isActive": true,
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

### Remove Engagement

**DELETE** `/api/organizations/{organizationId}/members/{memberId}/engagements/{engagementId}`

Remove a project engagement.

#### Response

```json
{
  "success": true,
  "message": "Engagement removed successfully"
}
```

## Time-off Management

### List Time-off Entries

**GET** `/api/organizations/{organizationId}/members/{memberId}/time-off`

Retrieve all time-off entries for a member.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by time-off type |
| `status` | string | Filter by approval status |
| `year` | number | Filter by year |

#### Response

```json
{
  "timeOffEntries": [
    {
      "id": "timeoff-uuid",
      "organizationMemberId": "member-uuid",
      "type": "vacation",
      "startDate": "2024-06-01",
      "endDate": "2024-06-07",
      "description": "Summer vacation",
      "approvedBy": "approver-user-uuid",
      "status": "approved",
      "createdAt": "2024-05-15T10:00:00Z"
    }
  ],
  "summary": {
    "totalDaysThisYear": 15,
    "vacationDaysUsed": 10,
    "sickDaysUsed": 3,
    "otherDaysUsed": 2
  }
}
```

### Add Time-off Entry

**POST** `/api/organizations/{organizationId}/members/{memberId}/time-off`

Add a new time-off entry.

#### Request Body

```json
{
  "type": "vacation",
  "startDate": "2024-08-01",
  "endDate": "2024-08-07",
  "description": "Family vacation",
  "status": "pending"
}
```

#### Response

```json
{
  "id": "timeoff-uuid",
  "organizationMemberId": "member-uuid",
  "type": "vacation",
  "startDate": "2024-08-01",
  "endDate": "2024-08-07",
  "description": "Family vacation",
  "approvedBy": null,
  "status": "pending",
  "createdAt": "2024-07-15T10:00:00Z"
}
```

### Update Time-off Entry

**PUT** `/api/organizations/{organizationId}/members/{memberId}/time-off/{entryId}`

Update an existing time-off entry.

#### Request Body

```json
{
  "type": "vacation",
  "startDate": "2024-08-02",
  "endDate": "2024-08-08",
  "description": "Extended family vacation",
  "status": "approved"
}
```

### Remove Time-off Entry

**DELETE** `/api/organizations/{organizationId}/members/{memberId}/time-off/{entryId}`

Remove a time-off entry.

#### Response

```json
{
  "success": true,
  "message": "Time-off entry removed successfully"
}
```

## Timeline Events

### List Timeline Events

**GET** `/api/organizations/{organizationId}/members/{memberId}/timeline`

Retrieve timeline events for a member.

#### Response

```json
{
  "events": [
    {
      "id": "event-uuid",
      "organizationMemberId": "member-uuid",
      "eventName": "Promotion to Senior Developer",
      "eventDate": "2024-03-01",
      "description": "Promoted due to excellent performance",
      "createdBy": "manager-user-uuid",
      "createdAt": "2024-03-01T10:00:00Z"
    }
  ]
}
```

### Add Timeline Event

**POST** `/api/organizations/{organizationId}/members/{memberId}/timeline`

Add a new timeline event.

#### Request Body

```json
{
  "eventName": "Completed Certification",
  "eventDate": "2024-04-15",
  "description": "Completed AWS Solutions Architect certification"
}
```

#### Response

```json
{
  "id": "event-uuid",
  "organizationMemberId": "member-uuid",
  "eventName": "Completed Certification",
  "eventDate": "2024-04-15",
  "description": "Completed AWS Solutions Architect certification",
  "createdBy": "user-uuid",
  "createdAt": "2024-04-15T10:00:00Z"
}
```

## Permission Sets

### List Permission Sets

**GET** `/api/organizations/{organizationId}/permission-sets`

Retrieve all permission sets for the organization.

#### Response

```json
{
  "permissionSets": [
    {
      "id": "permission-set-uuid",
      "organizationId": "org-uuid",
      "name": "Developer",
      "permissions": {
        "teamMembers": {
          "viewAll": false,
          "manageAll": false
        },
        "projects": {
          "viewAll": false,
          "manageAll": false,
          "viewAssigned": true,
          "manageAssigned": false
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
          "viewAssigned": false,
          "manageAssigned": false
        },
        "worklogs": {
          "manageAll": false
        }
      },
      "isDefault": false,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z",
      "_count": {
        "members": 5
      }
    }
  ]
}
```

### Create Permission Set

**POST** `/api/organizations/{organizationId}/permission-sets`

Create a new custom permission set.

#### Request Body

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

### Update Permission Set

**PUT** `/api/organizations/{organizationId}/permission-sets/{setId}`

Update an existing permission set.

### Delete Permission Set

**DELETE** `/api/organizations/{organizationId}/permission-sets/{setId}`

Delete a permission set with member reassignment.

#### Request Body

```json
{
  "reassignToSetId": "default-permission-set-uuid"
}
```

## Custom Roles

### List Custom Roles

**GET** `/api/organizations/{organizationId}/roles`

Retrieve all custom roles for the organization.

#### Response

```json
{
  "roles": [
    {
      "id": "role-uuid",
      "organizationId": "org-uuid",
      "name": "Senior Developer",
      "color": "#3B82F6",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Create Custom Role

**POST** `/api/organizations/{organizationId}/roles`

Create a new custom role.

#### Request Body

```json
{
  "name": "Tech Lead",
  "color": "#10B981"
}
```

### Update Custom Role

**PUT** `/api/organizations/{organizationId}/roles/{roleId}`

Update an existing custom role.

### Delete Custom Role

**DELETE** `/api/organizations/{organizationId}/roles/{roleId}`

Delete a custom role.

## Audit Logs

### List Audit Logs

**GET** `/api/organizations/{organizationId}/audit-logs`

Retrieve audit logs for the organization (admin only).

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `resourceType` | string | Filter by resource type |
| `action` | string | Filter by action |
| `startDate` | string | Start date for filtering |
| `endDate` | string | End date for filtering |
| `limit` | number | Number of results per page |
| `offset` | number | Offset for pagination |

#### Response

```json
{
  "logs": [
    {
      "id": "audit-uuid",
      "organizationId": "org-uuid",
      "userId": "user-uuid",
      "action": "member.role.updated",
      "resourceType": "member",
      "resourceId": "member-uuid",
      "details": {
        "oldRole": "member",
        "newRole": "admin"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-20T10:00:00Z"
    }
  ],
  "total": 150
}
```

#### Required Permissions
- `teamMembers.manageAll`

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **Bulk operations**: 10 requests per minute per user
- **Search endpoints**: 50 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Webhooks

The system supports webhooks for real-time notifications of important events:

### Supported Events

- `member.added` - New member added to organization
- `member.removed` - Member removed from organization
- `member.role.updated` - Member role changed
- `engagement.created` - New project engagement created
- `engagement.updated` - Project engagement updated
- `timeoff.approved` - Time-off request approved
- `timeoff.rejected` - Time-off request rejected

### Webhook Payload

```json
{
  "event": "member.added",
  "organizationId": "org-uuid",
  "timestamp": "2024-01-20T10:00:00Z",
  "data": {
    "member": { /* member object */ },
    "addedBy": "user-uuid"
  }
}
```

## SDK and Client Libraries

Official client libraries are available for:

- **JavaScript/TypeScript**: `@team-management/js-sdk`
- **Python**: `team-management-python`
- **Go**: `github.com/team-management/go-sdk`

## Support and Resources

- **API Status**: https://status.team-management.com
- **Developer Portal**: https://developers.team-management.com
- **Support**: support@team-management.com
- **GitHub**: https://github.com/team-management/api

## Changelog

### v1.0.0 (2024-01-15)
- Initial release of Team Management API
- Full CRUD operations for members, profiles, engagements, and time-off
- Permission sets and custom roles support
- Audit logging and webhooks