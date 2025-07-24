# Design Document

## Overview

The Team Management feature will be implemented as a comprehensive organization-level user and permission management system. It will extend the existing organization structure to include detailed member profiles, custom permission sets, engagement tracking, time-off management, and advanced filtering capabilities. The design follows the existing patterns in the codebase using Next.js App Router, Prisma ORM, and React components with TypeScript.

## Architecture

### Database Schema Extensions

The design will extend the existing Prisma schema with new models to support the comprehensive team management functionality:

```prisma
// Custom Permission Sets
model PermissionSet {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  name           String
  permissions    Json     // Structured permissions object
  isDefault      Boolean  @default(false) @map("is_default")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members      OrganizationMember[]

  @@map("permission_sets")
}

// Extended Organization Member with additional fields
model OrganizationMember {
  // ... existing fields ...
  permissionSetId    String?   @map("permission_set_id") @db.Uuid
  jobTitle           String?   @map("job_title")
  workingHoursPerWeek Int?     @default(40) @map("working_hours_per_week")
  joinDate           DateTime? @map("join_date") @db.Date
  
  // Relationships
  permissionSet PermissionSet? @relation(fields: [permissionSetId], references: [id])
  engagements   ProjectEngagement[]
  timeOffEntries TimeOffEntry[]
  profileData   MemberProfile?
}

// Project Engagements (enhanced from existing ProjectMember)
model ProjectEngagement {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationMemberId String @map("organization_member_id") @db.Uuid
  projectId        String    @map("project_id") @db.Uuid
  role             String?   // Project-specific role
  hoursPerWeek     Int       @map("hours_per_week")
  startDate        DateTime  @map("start_date") @db.Date
  endDate          DateTime? @map("end_date") @db.Date
  isActive         Boolean   @default(true) @map("is_active")
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // Relationships
  organizationMember OrganizationMember @relation(fields: [organizationMemberId], references: [id], onDelete: Cascade)
  project           Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_engagements")
}

// Time Off Management
model TimeOffEntry {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationMemberId String @map("organization_member_id") @db.Uuid
  type             String    // 'vacation', 'parental_leave', 'sick_leave', 'paid_time_off', 'unpaid_time_off', 'other'
  startDate        DateTime  @map("start_date") @db.Date
  endDate          DateTime  @map("end_date") @db.Date
  description      String?
  approvedBy       String?   @map("approved_by") @db.Uuid
  status           String    @default("pending") // 'pending', 'approved', 'rejected'
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // Relationships
  organizationMember OrganizationMember @relation(fields: [organizationMemberId], references: [id], onDelete: Cascade)
  approver          User?              @relation("TimeOffApprover", fields: [approvedBy], references: [id])

  @@map("time_off_entries")
}

// Extended Member Profiles
model MemberProfile {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationMemberId String @unique @map("organization_member_id") @db.Uuid
  secondaryEmail   String?   @map("secondary_email")
  address          String?
  phone            String?
  linkedin         String?
  skype            String?
  twitter          String?
  birthday         DateTime? @db.Date
  maritalStatus    String?   @map("marital_status")
  family           String?
  other            String?
  visibility       Json      @default("{}") // Controls who can see what fields
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  // Relationships
  organizationMember OrganizationMember @relation(fields: [organizationMemberId], references: [id], onDelete: Cascade)

  @@map("member_profiles")
}

// Timeline Events
model TimelineEvent {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationMemberId String @map("organization_member_id") @db.Uuid
  eventName        String   @map("event_name")
  eventDate        DateTime @map("event_date") @db.Date
  description      String?
  createdBy        String   @map("created_by") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relationships
  organizationMember OrganizationMember @relation(fields: [organizationMemberId], references: [id], onDelete: Cascade)
  creator           User               @relation("TimelineEventCreator", fields: [createdBy], references: [id])

  @@map("timeline_events")
}

// Custom Roles (for job positions)
model CustomRole {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  name           String
  color          String   @default("#3B82F6")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relationships
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, name])
  @@map("custom_roles")
}
```

### API Architecture

The API will follow RESTful patterns consistent with the existing codebase:

```
/api/organizations/[id]/members/
├── GET     - List all organization members with filtering
├── POST    - Add new member or send invitation
├── [memberId]/
│   ├── GET    - Get member details
│   ├── PUT    - Update member information
│   ├── DELETE - Remove member from organization
│   ├── profile/
│   │   ├── GET - Get member profile
│   │   └── PUT - Update member profile
│   ├── engagements/
│   │   ├── GET  - Get member engagements
│   │   ├── POST - Add new engagement
│   │   └── [engagementId]/
│   │       ├── PUT    - Update engagement
│   │       └── DELETE - Remove engagement
│   ├── time-off/
│   │   ├── GET  - Get time-off entries
│   │   ├── POST - Add time-off entry
│   │   └── [entryId]/
│   │       ├── PUT    - Update time-off entry
│   │       └── DELETE - Remove time-off entry
│   └── timeline/
│       ├── GET  - Get timeline events
│       ├── POST - Add timeline event
│       └── [eventId]/
│           ├── PUT    - Update timeline event
│           └── DELETE - Remove timeline event

/api/organizations/[id]/permission-sets/
├── GET     - List permission sets
├── POST    - Create permission set
└── [setId]/
    ├── GET    - Get permission set details
    ├── PUT    - Update permission set
    └── DELETE - Delete permission set

/api/organizations/[id]/roles/
├── GET     - List custom roles
├── POST    - Create custom role
└── [roleId]/
    ├── PUT    - Update custom role
    └── DELETE - Delete custom role
```

## Components and Interfaces

### Core Components Structure

```
components/team-management/
├── TeamManagementPage.tsx          # Main page component
├── MemberTable.tsx                 # Members list with filtering
├── MemberProfileCard.tsx           # Detailed member profile modal
├── MemberInviteDialog.tsx          # Invite new members
├── PermissionSetManager.tsx        # Permission sets management
├── EngagementManager.tsx           # Project engagements
├── TimeOffManager.tsx              # Time-off management
├── TimelineManager.tsx             # Timeline events
├── FilterPanel.tsx                 # Advanced filtering
├── RoleManager.tsx                 # Custom roles management
└── tabs/
    ├── MembersTab.tsx              # Members tab content
    ├── GuestsTab.tsx               # Guests tab content
    └── PermissionSetsTab.tsx       # Permission sets tab content
```

### Key Interfaces

```typescript
// Core Types
interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  permissionSetId?: string
  jobTitle?: string
  workingHoursPerWeek: number
  joinDate?: Date
  createdAt: Date
  user: User
  permissionSet?: PermissionSet
  engagements: ProjectEngagement[]
  timeOffEntries: TimeOffEntry[]
  profileData?: MemberProfile
}

interface PermissionSet {
  id: string
  organizationId: string
  name: string
  permissions: PermissionConfig
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

interface PermissionConfig {
  teamMembers: {
    viewAll: boolean
    manageAll: boolean
  }
  projects: {
    viewAll: boolean
    manageAll: boolean
    viewAssigned: boolean
    manageAssigned: boolean
  }
  invoicing: {
    viewAll: boolean
    manageAll: boolean
    viewAssigned: boolean
    manageAssigned: boolean
  }
  clients: {
    viewAll: boolean
    manageAll: boolean
    viewAssigned: boolean
    manageAssigned: boolean
  }
  worklogs: {
    manageAll: boolean
  }
}

interface ProjectEngagement {
  id: string
  organizationMemberId: string
  projectId: string
  role?: string
  hoursPerWeek: number
  startDate: Date
  endDate?: Date
  isActive: boolean
  project: Project
}

interface TimeOffEntry {
  id: string
  organizationMemberId: string
  type: 'vacation' | 'parental_leave' | 'sick_leave' | 'paid_time_off' | 'unpaid_time_off' | 'other'
  startDate: Date
  endDate: Date
  description?: string
  approvedBy?: string
  status: 'pending' | 'approved' | 'rejected'
}

interface MemberProfile {
  id: string
  organizationMemberId: string
  secondaryEmail?: string
  address?: string
  phone?: string
  linkedin?: string
  skype?: string
  twitter?: string
  birthday?: Date
  maritalStatus?: string
  family?: string
  other?: string
  visibility: Record<string, 'admin' | 'member'>
}

interface FilterOptions {
  roles?: string[]
  projects?: string[]
  totalHours?: { min: number; max: number }
  availabilityHours?: { min: number; max: number }
  permissions?: string[]
}
```

## Data Models

### Permission System Design

The permission system will use a hierarchical structure:

1. **Default Permissions**: Owner, Admin, Member, Guest (read-only)
2. **Custom Permission Sets**: Granular permissions for specific organizational needs
3. **Permission Inheritance**: Custom sets can inherit from default permissions
4. **Permission Dependencies**: Manage permissions require view permissions

### Engagement Calculation

Available hours calculation:
```typescript
const calculateAvailability = (member: OrganizationMember): number => {
  const totalHours = member.workingHoursPerWeek
  const engagedHours = member.engagements
    .filter(e => e.isActive)
    .reduce((sum, e) => sum + e.hoursPerWeek, 0)
  return Math.max(0, totalHours - engagedHours)
}
```

### Time-off Integration

Time-off entries will integrate with engagement calculations to show true availability during specific periods.

## Error Handling

### API Error Responses

```typescript
interface ApiError {
  error: string
  details?: any
  code?: string
}

// Common error scenarios:
// - 403: Insufficient permissions
// - 404: Member/resource not found
// - 400: Validation errors
// - 409: Conflict (e.g., member already exists)
```

### Client-side Error Handling

- Toast notifications for user feedback
- Graceful degradation for permission-restricted features
- Loading states and error boundaries
- Retry mechanisms for failed requests

## Testing Strategy

### Unit Tests
- Permission calculation logic
- Availability calculations
- Data validation functions
- Component rendering with different permission levels

### Integration Tests
- API endpoints with different user roles
- Database operations and constraints
- Permission enforcement across components

### E2E Tests
- Complete member management workflows
- Permission set creation and assignment
- Engagement and time-off management flows
- Filter and search functionality

### Test Data Setup
- Seed data for different organization structures
- Mock users with various permission levels
- Sample engagements and time-off entries

## Security Considerations

### Permission Enforcement
- Server-side permission checks on all API endpoints
- Client-side permission hiding for UI elements
- Row-level security for sensitive data access

### Data Privacy
- Configurable visibility settings for profile information
- Audit logging for sensitive operations
- GDPR compliance for personal data handling

### Input Validation
- Zod schemas for all API inputs
- Client-side validation for immediate feedback
- Sanitization of user-generated content

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Efficient joins for member data retrieval
- Pagination for large member lists

### Caching Strategy
- React Query for client-side caching
- Optimistic updates for better UX
- Cache invalidation on data mutations

### Loading Optimization
- Skeleton loading states
- Progressive data loading
- Lazy loading for heavy components

## Accessibility

### WCAG Compliance
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance

### Responsive Design
- Mobile-first approach
- Touch-friendly interface elements
- Adaptive layouts for different screen sizes