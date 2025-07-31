# Variable Initialization Order Fix Summary

## Problem
Runtime error in `components/team-management/TeamManagementPage.tsx`:
```
Error: Cannot access 'canManagePermissions' before initialization
components/team-management/TeamManagementPage.tsx (92:32) @ TeamManagementPageContent
```

## Root Cause
The `useEffect` hook was trying to use `canManagePermissions` variable before it was declared, creating a temporal dead zone error in JavaScript.

**Problematic Code Structure:**
```typescript
// useEffect using canManagePermissions (line ~80)
useEffect(() => {
  const tab = searchParams.get('tab') || 'members'
  
  // This line caused the error - canManagePermissions not yet declared
  if ((tab === 'permission-sets' || tab === 'custom-roles') && !canManagePermissions) {
    handleTabChange('members')
    return
  }
  
  if (tab !== activeTab) {
    setActiveTab(tab)
  }
}, [searchParams, activeTab, canManagePermissions, handleTabChange])

// ... other code ...

// canManagePermissions declaration (line ~150)
const canManagePermissions = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
```

## Solution
Moved the data fetching and permission calculations before the `useEffect` that depends on them:

**Fixed Code Structure:**
```typescript
// 1. First: Fetch team members data
const {
  members,
  pendingInvitations,
  isLoading: membersLoading,
  error: membersError,
  resendInvitation,
  cancelInvitation,
  isResendingInvitation,
  isCancellingInvitation,
} = useTeamMembers(organizationId, debouncedFilters, {
  enableOptimisticUpdates: true,
})

// 2. Second: Calculate permissions based on fetched data
const membersArray = Array.isArray(members) ? members : []
const currentUserMember = membersArray.find(member => member.userId === user?.id)
const canManageMembers = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
const canManagePermissions = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

// 3. Third: Use permissions in useEffect (now canManagePermissions is available)
useEffect(() => {
  const tab = searchParams.get('tab') || 'members'
  
  // Now this works correctly
  if ((tab === 'permission-sets' || tab === 'custom-roles') && !canManagePermissions) {
    handleTabChange('members')
    return
  }
  
  if (tab !== activeTab) {
    setActiveTab(tab)
  }
}, [searchParams, activeTab, canManagePermissions, handleTabChange])
```

## Key Changes
1. **Moved data fetching up**: `useTeamMembers` hook call moved before the problematic `useEffect`
2. **Moved permission calculations up**: All permission-related variables moved before the `useEffect`
3. **Maintained dependency order**: Ensured all dependencies are available before they're used

## Benefits
- ✅ Eliminates runtime error
- ✅ Maintains correct permission checking logic
- ✅ Preserves all existing functionality
- ✅ Follows React hooks best practices
- ✅ No changes to component behavior or UI

## Files Modified
- `components/team-management/TeamManagementPage.tsx`

## Testing
- ✅ Build completes successfully
- ✅ No runtime errors
- ✅ Permission-based tab restrictions work correctly
- ✅ All team management functionality preserved

## Technical Notes
This is a common JavaScript/TypeScript issue where variables are accessed before they're declared in the same scope. The fix ensures proper declaration order while maintaining the same logical flow and functionality.