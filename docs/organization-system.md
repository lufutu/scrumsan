# Global Organization System

This document explains how the global organization system works in ScrumSan.

## Overview

The organization system provides global state management for organizations across the entire application. It automatically loads organizations when a user logs in and maintains an active organization context.

## Key Components

### 1. OrganizationProvider (`providers/organization-provider.tsx`)

The main provider that wraps the entire app and manages:
- Loading organizations from the API
- Managing active organization state
- Persisting active organization in localStorage
- Automatic organization switching logic

### 2. useOrganization Hook

Provides access to the full organization context:

```tsx
import { useOrganization } from '@/providers/organization-provider'

function MyComponent() {
  const { 
    organizations,     // All user's organizations
    activeOrg,        // Currently active organization
    isLoading,        // Loading state
    error,            // Error state
    setActiveOrg,     // Function to change active org
    refreshOrganizations // Function to reload organizations
  } = useOrganization()
}
```

### 3. useActiveOrg Hook (`hooks/useActiveOrg.ts`)

Convenience hook for accessing just the active organization:

```tsx
import { useActiveOrg } from '@/hooks/useActiveOrg'

function MyComponent() {
  const activeOrg = useActiveOrg()
  
  if (!activeOrg) {
    return <div>No organization selected</div>
  }
  
  return <div>Working on: {activeOrg.name}</div>
}
```

## How It Works

### 1. App Initialization
- When the app loads, `OrganizationProvider` waits for user authentication
- Once user is authenticated, it automatically fetches organizations
- If organizations exist, it sets the first one as active (or restores from localStorage)

### 2. Active Organization Logic
- **First Load**: Sets the first organization as active
- **Persistence**: Saves active org ID to localStorage
- **Restoration**: On app reload, tries to restore the previously active organization
- **Fallback**: If saved org is no longer available, falls back to first organization
- **Cleanup**: Clears active org when user logs out

### 3. Organization Switching
- Users can switch organizations via the org-switcher dropdown
- Active organization is immediately updated globally
- New selection is persisted to localStorage

## Usage Examples

### Display Active Organization
```tsx
import { ActiveOrgDisplay } from '@/components/organization/active-org-display'

function Header() {
  return (
    <div>
      <ActiveOrgDisplay showLogo showDescription />
    </div>
  )
}
```

### Check Active Organization
```tsx
import { useActiveOrg } from '@/hooks/useActiveOrg'

function ProjectList() {
  const activeOrg = useActiveOrg()
  
  // Fetch projects for the active organization
  const { data: projects } = useSWR(
    activeOrg ? `/api/organizations/${activeOrg.id}/projects` : null,
    fetcher
  )
  
  return <div>{/* Render projects */}</div>
}
```

### Create Organization
```tsx
import { useOrganization } from '@/providers/organization-provider'

function CreateOrgButton() {
  const { refreshOrganizations } = useOrganization()
  
  const handleCreate = async (orgData) => {
    // Create organization via API
    await createOrganization(orgData)
    
    // Refresh the global organizations list
    await refreshOrganizations()
  }
}
```

## Benefits

1. **Global State**: Active organization is available everywhere in the app
2. **Automatic Loading**: Organizations load automatically on app start
3. **Persistence**: Active organization persists across browser sessions
4. **Reactive**: All components automatically update when active org changes
5. **Type Safe**: Full TypeScript support with proper types
6. **Performance**: Uses React context to avoid prop drilling

## Integration Points

- **Sidebar**: Shows organization switcher with current active org
- **API Calls**: Can use active org ID for organization-scoped requests
- **Navigation**: Can redirect based on active organization
- **Permissions**: Can check user permissions within active organization 