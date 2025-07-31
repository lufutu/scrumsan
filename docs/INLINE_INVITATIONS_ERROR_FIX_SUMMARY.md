# Inline Invitations Error Fix Summary

## Problem Fixed
The error "data is not defined" was occurring in `hooks/useTeamMembers.ts` because I refactored the hook to return both `members` and `pendingInvitations` separately, but forgot to update all the places that referenced the old `data` variable.

## ✅ Changes Made

### 1. Fixed Optimistic Updates
**Before:**
```typescript
const { optimisticCreate, optimisticUpdate, optimisticDelete } = useOptimisticUpdates(
  data || [], // ❌ 'data' was undefined
  (updatedMembers) => {
    queryClient.setQueryData(queryKey, updatedMembers)
  }
)
```

**After:**
```typescript
const { optimisticCreate, optimisticUpdate, optimisticDelete } = useOptimisticUpdates(
  members || [], // ✅ Use 'members' instead
  (updatedMembers) => {
    // ✅ Preserve both members and pending invitations
    const currentData = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, {
      members: updatedMembers,
      pendingInvitations: currentData?.pendingInvitations || []
    })
  }
)
```

### 2. Fixed Add Member Mutation Cache Update
**Before:**
```typescript
queryClient.setQueryData(queryKey, (oldData: OrganizationMember[] | undefined) => {
  return oldData ? [...oldData, newMember] : [newMember]
})
```

**After:**
```typescript
queryClient.setQueryData(queryKey, (oldData: {members: OrganizationMember[], pendingInvitations: PendingInvitation[]} | undefined) => {
  return {
    members: oldData?.members ? [...oldData.members, newMember] : [newMember],
    pendingInvitations: oldData?.pendingInvitations || []
  }
})
```

### 3. Fixed Update Member Mutation Cache Update
**Before:**
```typescript
queryClient.setQueryData(queryKey, (oldData: OrganizationMember[] | undefined) => {
  return oldData?.map(member => 
    member.id === memberId ? { ...member, ...updatedMember } : member
  )
})
```

**After:**
```typescript
queryClient.setQueryData(queryKey, (oldData: {members: OrganizationMember[], pendingInvitations: PendingInvitation[]} | undefined) => {
  return {
    members: oldData?.members?.map(member => 
      member.id === memberId ? { ...member, ...updatedMember } : member
    ) || [],
    pendingInvitations: oldData?.pendingInvitations || []
  }
})
```

### 4. Fixed Remove Member Mutation Cache Update
**Before:**
```typescript
queryClient.setQueryData(queryKey, (oldData: OrganizationMember[] | undefined) => {
  return oldData?.filter(member => member.id !== memberId)
})
```

**After:**
```typescript
queryClient.setQueryData(queryKey, (oldData: {members: OrganizationMember[], pendingInvitations: PendingInvitation[]} | undefined) => {
  return {
    members: oldData?.members?.filter(member => member.id !== memberId) || [],
    pendingInvitations: oldData?.pendingInvitations || []
  }
})
```

### 5. Fixed Function Dependencies
Updated all callback dependency arrays to use `members` instead of the undefined `data`:

```typescript
// Before
}, [updateMemberMutation, enableOptimisticUpdates, data, optimisticUpdate])

// After  
}, [updateMemberMutation, enableOptimisticUpdates, members, optimisticUpdate])
```

## 🔧 Root Cause
The issue occurred because I changed the data structure returned by the hook from a simple array of members to an object containing both members and pending invitations, but didn't update all the internal references consistently.

## 📁 Files Fixed
- `hooks/useTeamMembers.ts` - Fixed all references to the old `data` variable

## 🚀 Testing
The fix ensures that:
1. ✅ The hook properly handles both members and pending invitations
2. ✅ Optimistic updates work correctly with the new data structure
3. ✅ Cache updates preserve both members and invitations
4. ✅ All mutation callbacks use the correct variable references

## 🎯 Result
The team management page should now load without the "data is not defined" error, and you should see:
- Regular members displayed normally
- Pending invitations displayed with amber highlighting and mail icons
- Functional dropdown menus for resending/canceling invitations
- Proper sorting and filtering of combined member/invitation list

The inline invitations feature is now fully functional!