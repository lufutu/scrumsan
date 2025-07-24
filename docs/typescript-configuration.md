# TypeScript Configuration and Type Safety

## Overview

The Team Management system is built with strict TypeScript configuration to ensure type safety, better developer experience, and reduced runtime errors. This document outlines the TypeScript setup, type definitions, and best practices.

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### Key Configuration Options

- **strict: true** - Enables all strict type checking options
- **noImplicitAny: true** - Disallows implicit any types
- **strictNullChecks: true** - Ensures null and undefined are handled explicitly
- **noUnusedLocals: true** - Reports errors on unused local variables
- **exactOptionalPropertyTypes: true** - Ensures optional properties are exactly optional

## Core Type Definitions

### Organization Member Types

```typescript
/**
 * Complete organization member data structure
 */
export interface OrganizationMember {
  /** Unique identifier for the organization membership */
  id: string
  /** ID of the organization */
  organizationId: string
  /** ID of the user */
  userId: string
  /** Role of the member in the organization */
  role: 'owner' | 'admin' | 'member' | 'guest'
  /** ID of assigned custom permission set */
  permissionSetId?: string | null
  /** Job title or position */
  jobTitle?: string | null
  /** Working hours per week */
  workingHoursPerWeek: number
  /** Date when the member joined the organization */
  joinDate?: string | null
  /** Timestamp when the membership was created */
  createdAt: string
  /** User information */
  user: UserInfo
  /** Custom permission set data */
  permissionSet?: PermissionSetInfo | null
  /** Array of project engagements */
  engagements: ProjectEngagement[]
  /** Array of time-off entries */
  timeOffEntries: TimeOffEntry[]
  /** Extended profile information */
  profileData?: MemberProfile | null
}

/**
 * User information subset
 */
export interface UserInfo {
  id: string
  fullName: string | null
  email: string
  avatarUrl?: string | null
}

/**
 * Permission set information
 */
export interface PermissionSetInfo {
  id: string
  name: string
  permissions: PermissionConfig
}
```

### Permission System Types

```typescript
/**
 * Comprehensive permission configuration
 */
export interface PermissionConfig {
  teamMembers: TeamMemberPermissions
  projects: ProjectPermissions
  invoicing: InvoicingPermissions
  clients: ClientPermissions
  worklogs: WorklogPermissions
}

/**
 * Team member management permissions
 */
export interface TeamMemberPermissions {
  /** Can view all team members */
  viewAll: boolean
  /** Can manage all team members */
  manageAll: boolean
}

/**
 * Project management permissions
 */
export interface ProjectPermissions {
  /** Can view all projects */
  viewAll: boolean
  /** Can manage all projects */
  manageAll: boolean
  /** Can view assigned projects */
  viewAssigned: boolean
  /** Can manage assigned projects */
  manageAssigned: boolean
}

/**
 * Invoicing permissions
 */
export interface InvoicingPermissions {
  /** Can view all invoicing data */
  viewAll: boolean
  /** Can manage all invoicing data */
  manageAll: boolean
  /** Can view assigned invoicing data */
  viewAssigned: boolean
  /** Can manage assigned invoicing data */
  manageAssigned: boolean
}

/**
 * Client management permissions
 */
export interface ClientPermissions {
  /** Can view all clients */
  viewAll: boolean
  /** Can manage all clients */
  manageAll: boolean
  /** Can view assigned clients */
  viewAssigned: boolean
  /** Can manage assigned clients */
  manageAssigned: boolean
}

/**
 * Worklog management permissions
 */
export interface WorklogPermissions {
  /** Can manage all worklogs */
  manageAll: boolean
}

/**
 * Enumeration of all possible permission actions
 */
export type PermissionAction = 
  | 'teamMembers.viewAll'
  | 'teamMembers.manageAll'
  | 'projects.viewAll'
  | 'projects.manageAll'
  | 'projects.viewAssigned'
  | 'projects.manageAssigned'
  | 'invoicing.viewAll'
  | 'invoicing.manageAll'
  | 'invoicing.viewAssigned'
  | 'invoicing.manageAssigned'
  | 'clients.viewAll'
  | 'clients.manageAll'
  | 'clients.viewAssigned'
  | 'clients.manageAssigned'
  | 'worklogs.manageAll'
```

### Engagement and Availability Types

```typescript
/**
 * Project engagement data
 */
export interface ProjectEngagement {
  /** Unique identifier for the engagement */
  id: string
  /** ID of the organization member */
  organizationMemberId: string
  /** ID of the project */
  projectId: string
  /** Role or position in this engagement */
  role?: string | null
  /** Number of hours per week allocated */
  hoursPerWeek: number
  /** Start date of the engagement */
  startDate: string
  /** End date of the engagement (null for ongoing) */
  endDate?: string | null
  /** Whether this engagement is currently active */
  isActive: boolean
  /** Timestamp when the engagement was created */
  createdAt: string
  /** Project information */
  project: ProjectInfo
}

/**
 * Project information subset
 */
export interface ProjectInfo {
  id: string
  name: string
  description?: string | null
}

/**
 * Availability calculation result
 */
export interface AvailabilityResult {
  /** Total working hours per week */
  totalHours: number
  /** Hours currently engaged in active projects */
  engagedHours: number
  /** Available hours for new engagements */
  availableHours: number
  /** Number of currently active engagements */
  activeEngagementsCount: number
  /** Percentage of total hours currently utilized */
  utilizationPercentage: number
  /** Number of time-off days taken this month */
  timeOffDaysThisMonth: number
  /** Number of time-off days taken this year */
  timeOffDaysThisYear: number
  /** Whether the member is currently on time-off */
  isCurrentlyOnTimeOff: boolean
  /** Array of upcoming time-off entries */
  upcomingTimeOff: TimeOffEntry[]
}
```

### Time-off Types

```typescript
/**
 * Time-off entry data
 */
export interface TimeOffEntry {
  /** Unique identifier for the time-off entry */
  id: string
  /** ID of the organization member */
  organizationMemberId: string
  /** Type of time-off */
  type: TimeOffType
  /** Start date of the time-off period */
  startDate: string
  /** End date of the time-off period */
  endDate: string
  /** Optional description or notes */
  description?: string | null
  /** ID of the user who approved the request */
  approvedBy?: string | null
  /** Approval status of the request */
  status: TimeOffStatus
  /** Timestamp when the entry was created */
  createdAt: string
}

/**
 * Time-off type enumeration
 */
export type TimeOffType = 
  | 'vacation'
  | 'parental_leave'
  | 'sick_leave'
  | 'paid_time_off'
  | 'unpaid_time_off'
  | 'other'

/**
 * Time-off status enumeration
 */
export type TimeOffStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
```

### Profile Types

```typescript
/**
 * Member profile data
 */
export interface MemberProfile {
  /** Unique identifier for the profile */
  id: string
  /** ID of the organization member */
  organizationMemberId: string
  /** Secondary email address */
  secondaryEmail?: string | null
  /** Physical address */
  address?: string | null
  /** Phone number */
  phone?: string | null
  /** LinkedIn profile URL */
  linkedin?: string | null
  /** Skype username */
  skype?: string | null
  /** Twitter handle */
  twitter?: string | null
  /** Birthday date */
  birthday?: string | null
  /** Marital status */
  maritalStatus?: string | null
  /** Family information */
  family?: string | null
  /** Other additional information */
  other?: string | null
  /** Visibility settings for each field */
  visibility: ProfileVisibility
  /** Timestamp when the profile was created */
  createdAt: string
  /** Timestamp when the profile was last updated */
  updatedAt: string
}

/**
 * Profile field visibility settings
 */
export interface ProfileVisibility {
  [fieldName: string]: 'admin' | 'member'
}

/**
 * Profile update data structure
 */
export interface ProfileUpdateData {
  secondaryEmail?: string | null
  address?: string | null
  phone?: string | null
  linkedin?: string | null
  skype?: string | null
  twitter?: string | null
  birthday?: string | null
  maritalStatus?: string | null
  family?: string | null
  other?: string | null
  visibility?: ProfileVisibility
}
```

## API Response Types

### Standard API Response

```typescript
/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  nextCursor?: string
}

/**
 * API error response
 */
export interface ApiError {
  error: string
  details?: string
  code?: string
  field?: string
}
```

### Validation Types

```typescript
/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Field validation result
 */
export interface FieldValidation {
  [fieldName: string]: {
    valid: boolean
    error?: string
    warning?: string
  }
}
```

## React Hook Types

### Hook Return Types

```typescript
/**
 * Standard hook return type for data fetching
 */
export interface UseDataHook<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook return type for mutations
 */
export interface UseMutationHook<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  isLoading: boolean
  error: Error | null
  reset: () => void
}

/**
 * Team members hook return type
 */
export interface UseTeamMembersReturn {
  members: OrganizationMember[] | undefined
  isLoading: boolean
  error: Error | null
  addMember: (memberData: AddMemberData) => Promise<OrganizationMember>
  updateMember: (memberId: string, memberData: UpdateMemberData) => Promise<OrganizationMember>
  removeMember: (memberId: string, options?: RemoveMemberOptions) => Promise<void>
  calculateAvailability: (member: OrganizationMember) => number
  getFilteredMembers: (searchTerm?: string) => OrganizationMember[]
  refetch: () => Promise<void>
  isAddingMember: boolean
  isUpdatingMember: boolean
  isRemovingMember: boolean
}
```

## Utility Types

### Generic Utility Types

```typescript
/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Extract keys of a specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Create a type with only specific keys
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>

/**
 * Recursive partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Non-nullable type
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never
```

### Domain-Specific Utility Types

```typescript
/**
 * Member creation data (omits generated fields)
 */
export type CreateMemberData = Omit<
  OrganizationMember,
  'id' | 'organizationId' | 'userId' | 'createdAt' | 'user' | 'permissionSet' | 'engagements' | 'timeOffEntries' | 'profileData'
> & {
  email: string
}

/**
 * Member update data (only updatable fields)
 */
export type UpdateMemberData = Partial<Pick<
  OrganizationMember,
  'role' | 'permissionSetId' | 'jobTitle' | 'workingHoursPerWeek' | 'joinDate'
>>

/**
 * Permission set creation data
 */
export type CreatePermissionSetData = Omit<
  PermissionSet,
  'id' | 'organizationId' | 'isDefault' | 'createdAt' | 'updatedAt' | '_count'
>

/**
 * Engagement creation data
 */
export type CreateEngagementData = Omit<
  ProjectEngagement,
  'id' | 'organizationMemberId' | 'createdAt' | 'project'
>
```

## Type Guards

### Runtime Type Checking

```typescript
/**
 * Check if value is a valid organization member
 */
export function isOrganizationMember(value: unknown): value is OrganizationMember {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'organizationId' in value &&
    'userId' in value &&
    'role' in value &&
    'workingHoursPerWeek' in value &&
    'createdAt' in value &&
    'user' in value
  )
}

/**
 * Check if value is a valid permission config
 */
export function isPermissionConfig(value: unknown): value is PermissionConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'teamMembers' in value &&
    'projects' in value &&
    'invoicing' in value &&
    'clients' in value &&
    'worklogs' in value
  )
}

/**
 * Check if value is a valid time-off type
 */
export function isTimeOffType(value: string): value is TimeOffType {
  return [
    'vacation',
    'parental_leave',
    'sick_leave',
    'paid_time_off',
    'unpaid_time_off',
    'other'
  ].includes(value)
}

/**
 * Check if value is a valid permission action
 */
export function isPermissionAction(value: string): value is PermissionAction {
  return [
    'teamMembers.viewAll',
    'teamMembers.manageAll',
    'projects.viewAll',
    'projects.manageAll',
    'projects.viewAssigned',
    'projects.manageAssigned',
    'invoicing.viewAll',
    'invoicing.manageAll',
    'invoicing.viewAssigned',
    'invoicing.manageAssigned',
    'clients.viewAll',
    'clients.manageAll',
    'clients.viewAssigned',
    'clients.manageAssigned',
    'worklogs.manageAll'
  ].includes(value)
}
```

## Best Practices

### Type Definition Guidelines

1. **Use Descriptive Names**: Type names should clearly indicate their purpose
2. **Document with JSDoc**: Add comprehensive documentation to all types
3. **Prefer Interfaces**: Use interfaces for object types, types for unions/primitives
4. **Use Strict Types**: Avoid `any` and `unknown` unless absolutely necessary
5. **Leverage Utility Types**: Use TypeScript utility types for transformations

### Code Examples

#### Good Type Usage

```typescript
// ✅ Good: Specific, well-documented interface
interface CreateMemberRequest {
  /** Email address of the new member */
  email: string
  /** Role to assign to the member */
  role: 'admin' | 'member'
  /** Optional job title */
  jobTitle?: string
  /** Working hours per week (default: 40) */
  workingHoursPerWeek?: number
}

// ✅ Good: Type-safe function with proper return type
async function addMember(
  organizationId: string,
  memberData: CreateMemberRequest
): Promise<OrganizationMember> {
  // Implementation
}
```

#### Avoid These Patterns

```typescript
// ❌ Bad: Using any
function processData(data: any): any {
  return data
}

// ❌ Bad: Unclear type names
interface Data {
  stuff: string
  things: number[]
}

// ❌ Bad: Missing null checks
function getName(user: { name?: string }): string {
  return user.name.toUpperCase() // Runtime error if name is undefined
}
```

### Error Handling Types

```typescript
/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

/**
 * Usage example
 */
async function fetchMember(id: string): AsyncResult<OrganizationMember> {
  try {
    const member = await api.getMember(id)
    return { success: true, data: member }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}
```

## Type Testing

### Testing Type Definitions

```typescript
// Type tests to ensure type safety
type TestOrganizationMember = {
  // Ensure all required fields are present
  id: string
  organizationId: string
  userId: string
  role: 'owner' | 'admin' | 'member' | 'guest'
  workingHoursPerWeek: number
  createdAt: string
  user: UserInfo
  // Optional fields
  permissionSetId?: string | null
  jobTitle?: string | null
  joinDate?: string | null
  permissionSet?: PermissionSetInfo | null
  engagements: ProjectEngagement[]
  timeOffEntries: TimeOffEntry[]
  profileData?: MemberProfile | null
}

// Compile-time test to ensure types match
const _typeTest: TestOrganizationMember = {} as OrganizationMember
```

## Migration and Updates

### Versioning Types

When updating types, follow these guidelines:

1. **Backward Compatibility**: Ensure new types are backward compatible
2. **Deprecation Warnings**: Add deprecation comments for removed fields
3. **Migration Utilities**: Provide utilities to migrate old data structures
4. **Version Documentation**: Document type changes in changelog

### Example Migration

```typescript
/**
 * @deprecated Use OrganizationMember instead
 */
export interface LegacyMember {
  id: string
  name: string
  email: string
}

/**
 * Migrate legacy member to new format
 */
export function migrateLegacyMember(legacy: LegacyMember): Partial<OrganizationMember> {
  return {
    id: legacy.id,
    user: {
      id: legacy.id,
      fullName: legacy.name,
      email: legacy.email,
      avatarUrl: null
    },
    role: 'member',
    workingHoursPerWeek: 40,
    createdAt: new Date().toISOString(),
    engagements: [],
    timeOffEntries: []
  }
}
```

## Tools and Validation

### Runtime Validation with Zod

```typescript
import { z } from 'zod'

// Zod schema for runtime validation
export const organizationMemberSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'guest']),
  permissionSetId: z.string().uuid().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  workingHoursPerWeek: z.number().min(0).max(168),
  joinDate: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  user: z.object({
    id: z.string().uuid(),
    fullName: z.string().nullable(),
    email: z.string().email(),
    avatarUrl: z.string().url().nullable().optional()
  }),
  // ... other fields
})

// Infer TypeScript type from Zod schema
export type OrganizationMemberFromSchema = z.infer<typeof organizationMemberSchema>
```

This comprehensive TypeScript configuration ensures type safety throughout the team management system while providing excellent developer experience and maintainability.