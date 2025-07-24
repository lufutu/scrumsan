# Design Document

## Overview

This design enhances the existing InvitationAcceptPage component to detect new users and provide an account creation flow. The solution integrates seamlessly with the current Supabase authentication system and maintains the existing invitation acceptance workflow for existing users.

## Architecture

### Component Structure

```
InvitationAcceptPage
├── ExistingUserFlow (current implementation)
│   ├── LoginRedirect (for unauthenticated users)
│   └── AcceptInvitation (for authenticated users)
└── NewUserFlow (new implementation)
    ├── AccountCreationForm
    ├── PasswordValidation
    └── AutoAcceptInvitation
```

### User Flow Decision Tree

1. **Invitation Link Accessed**
   - Fetch invitation details
   - Check if user exists in Supabase by email
   
2. **User Existence Check**
   - If user exists → Existing User Flow
   - If user doesn't exist → New User Flow

3. **New User Flow**
   - Display account creation form
   - Validate password input
   - Create Supabase auth user
   - Create application User record
   - Auto-login user
   - Accept invitation
   - Redirect to organization

## Components and Interfaces

### Enhanced InvitationAcceptPage Component

```typescript
interface InvitationAcceptPageProps {
  token: string
}

interface UserExistenceState {
  exists: boolean
  loading: boolean
  error: string | null
}

interface AccountCreationState {
  password: string
  confirmPassword: string
  isCreating: boolean
  error: string | null
}
```

### New AccountCreationForm Component

```typescript
interface AccountCreationFormProps {
  invitation: InvitationData
  onAccountCreated: (user: User) => void
  onError: (error: string) => void
}
```

### API Enhancement

The existing `/api/invitations/[token]/route.ts` will be enhanced with a new endpoint:

```typescript
// New endpoint: POST /api/invitations/[token]/create-account
interface CreateAccountRequest {
  password: string
}

interface CreateAccountResponse {
  user: User
  member: OrganizationMember
  organization: Organization
  message: string
}
```

## Data Models

### User Creation Flow

1. **Supabase Auth User Creation**
   ```typescript
   const { data: authUser, error } = await supabase.auth.signUp({
     email: invitation.email,
     password: password,
     options: {
       emailRedirectTo: undefined, // Skip email confirmation for invitations
       data: {
         full_name: invitation.email.split('@')[0], // Default name from email
       }
     }
   })
   ```

2. **Application User Record Creation**
   ```typescript
   const user = await prisma.user.create({
     data: {
       id: authUser.user.id,
       email: invitation.email,
       fullName: authUser.user.user_metadata.full_name,
       emailConfirmed: true, // Auto-confirm for invited users
       createdAt: new Date(),
       authSyncedAt: new Date(),
     }
   })
   ```

3. **Organization Member Creation**
   - Same as existing flow after user creation

## Error Handling

### Account Creation Errors

1. **Supabase Auth Errors**
   - Password too weak
   - Email already exists (edge case)
   - Network/service errors

2. **Database Errors**
   - User record creation failure
   - Transaction rollback scenarios

3. **Invitation Errors**
   - Expired invitation
   - Already accepted invitation
   - Invalid token

### Error Recovery

- **Partial Account Creation**: If Supabase user is created but database user fails, attempt cleanup
- **Transaction Safety**: Use database transactions for user and member creation
- **User Feedback**: Clear error messages with actionable guidance

## Testing Strategy

### Unit Tests

1. **Component Tests**
   - AccountCreationForm validation
   - User existence detection
   - Error state handling

2. **API Tests**
   - Account creation endpoint
   - Error scenarios
   - Transaction rollback

### Integration Tests

1. **End-to-End Flow**
   - Complete new user invitation acceptance
   - Existing user flow preservation
   - Error recovery scenarios

2. **Authentication Integration**
   - Supabase user creation
   - Auto-login functionality
   - Session management

### Security Tests

1. **Password Security**
   - Password strength validation
   - Secure transmission
   - Hash verification

2. **Invitation Security**
   - Token validation
   - Email verification
   - Expiration handling

## Implementation Considerations

### User Experience

1. **Progressive Enhancement**
   - Existing users see no changes
   - New users get streamlined experience
   - Clear visual feedback throughout

2. **Form Design**
   - Match reference image styling
   - Password strength indicator
   - Terms/privacy consent
   - Loading states

### Performance

1. **User Existence Check**
   - Efficient database query
   - Caching considerations
   - Minimal API calls

2. **Account Creation**
   - Optimistic UI updates
   - Background processing
   - Quick redirect after success

### Security

1. **Password Handling**
   - Client-side validation
   - Server-side enforcement
   - Secure transmission (HTTPS)

2. **Email Verification**
   - Skip email confirmation for invited users
   - Validate email matches invitation
   - Prevent account hijacking

### Backward Compatibility

1. **Existing Flow Preservation**
   - No changes to existing user experience
   - Same API endpoints for existing functionality
   - Gradual rollout capability

2. **Database Schema**
   - No schema changes required
   - Uses existing User and OrganizationMember models
   - Maintains referential integrity