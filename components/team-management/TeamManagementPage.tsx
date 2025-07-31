'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, UserPlus, Shield, Settings, Briefcase, LogOut, Mail } from 'lucide-react'
import { AppHeader } from '@/components/dashboard/app-header'
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsContents } from '@/components/animate-ui/radix/tabs'
import { Button } from '@/components/ui/button'
import { PageLoadingState } from '@/components/ui/loading-state'
import { PageErrorState } from '@/components/ui/error-state'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/ui/error-boundary'
import { useOrganization } from '@/providers/organization-provider'
import { useSupabase } from '@/providers/supabase-provider'
import { useTeamMembers, FilterOptions } from '@/hooks/useTeamMembers'
import { usePermissionSets } from '@/hooks/usePermissionSets'
import { useCustomRoles } from '@/hooks/useCustomRoles'
import { PermissionGuard } from '@/components/common/PermissionGuard'

import { usePageMetadata } from '@/hooks/usePageMetadata'
import { usePerformanceMonitor } from '@/lib/performance-monitoring'
import { useDebounce } from '@/hooks/useDebounce'
import { FilterPanel } from './FilterPanel'
import { MemberTable } from './MemberTable'
import { MemberInviteDialog } from './MemberInviteDialog'
import { MemberRemovalDialog } from './MemberRemovalDialog'
import { MemberProfileCard } from './MemberProfileCard'
import { PermissionSetManager } from './PermissionSetManager'
import { RoleManager } from './RoleManager'
import { GuestsTab } from './GuestsTab'
import { AdminProfileManager } from './AdminProfileManager'


interface TeamManagementPageProps {
  organizationId: string
}

export function TeamManagementPage({ organizationId }: TeamManagementPageProps) {
  return (
    <PageErrorBoundary>
      <TeamManagementPageContent organizationId={organizationId} />
    </PageErrorBoundary>
  )
}

function TeamManagementPageContent({ organizationId }: TeamManagementPageProps) {
  const { activeOrg } = useOrganization()
  const { user } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { measureRender, measureFilter } = usePerformanceMonitor()

  // Get initial tab from URL params, default to 'members'
  const initialTab = searchParams.get('tab') || 'members'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<import('@/hooks/useTeamMembers').OrganizationMember | null>(null)

  // Performance optimization: Filter state with debouncing
  const [filters, setFilters] = useState<FilterOptions>({})
  const debouncedFilters = useDebounce(filters, 300)

  // Handle member profile deep linking
  const memberIdFromUrl = searchParams.get('member')
  const memberTabFromUrl = searchParams.get('memberTab')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(memberIdFromUrl)
  const [selectedMemberTab, setSelectedMemberTab] = useState<string>(memberTabFromUrl || 'profile')

  // Update URL when tab changes
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab)
    const url = new URL(window.location.href)
    if (newTab === 'members') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', newTab)
    }
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Fetch team members with performance optimizations
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

  // Check user permissions - ensure members is an array
  const membersArray = Array.isArray(members) ? members : []
  const currentUserMember = membersArray.find(member => member.userId === user?.id)
  const canManageMembers = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
  const canManagePermissions = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

  // Update tab when URL changes and check permissions
  useEffect(() => {
    const tab = searchParams.get('tab') || 'members'
    
    // Redirect to members tab if user tries to access restricted tabs
    if ((tab === 'permission-sets' || tab === 'custom-roles') && !canManagePermissions) {
      handleTabChange('members')
      return
    }
    
    if (tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams, activeTab, canManagePermissions, handleTabChange])

  // Handle member profile URL updates
  const handleMemberProfileOpen = useCallback((memberId: string, memberTab?: string) => {
    setSelectedMemberId(memberId)
    setSelectedMemberTab(memberTab || 'profile')

    const url = new URL(window.location.href)
    url.searchParams.set('member', memberId)
    if (memberTab && memberTab !== 'profile') {
      url.searchParams.set('memberTab', memberTab)
    } else {
      url.searchParams.delete('memberTab')
    }
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  const handleMemberProfileClose = useCallback(() => {
    setSelectedMemberId(null)
    setSelectedMemberTab('profile')

    const url = new URL(window.location.href)
    url.searchParams.delete('member')
    url.searchParams.delete('memberTab')
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Update member profile when URL changes
  useEffect(() => {
    const memberId = searchParams.get('member')
    const memberTab = searchParams.get('memberTab') || 'profile'

    if (memberId !== selectedMemberId) {
      setSelectedMemberId(memberId)
    }
    if (memberTab !== selectedMemberTab) {
      setSelectedMemberTab(memberTab)
    }
  }, [searchParams, selectedMemberId, selectedMemberTab])

  // Performance optimization: Determine if we should use virtual scrolling
  const shouldUseVirtualScrolling = useMemo(() => {
    return membersArray.length > 100
  }, [membersArray.length])

  const {
    permissionSets,
    isLoading: permissionSetsLoading,
    error: permissionSetsError
  } = usePermissionSets(organizationId)

  const {
    roles,
    isLoading: rolesLoading,
    error: rolesError
  } = useCustomRoles(organizationId)

  // Performance optimization: Memoized filter handlers
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    measureFilter('team-members', membersArray.length, 0) // Will be updated after filtering
    setFilters(newFilters)
  }, [membersArray.length, measureFilter])



  // Performance monitoring for render
  useEffect(() => {
    if (membersArray.length > 0) {
      measureRender('TeamManagementPage', membersArray.length, shouldUseVirtualScrolling)
    }
  }, [membersArray.length, shouldUseVirtualScrolling, measureRender])

  // Set page metadata
  usePageMetadata({
    title: `Team Management - ${activeOrg?.name || 'Organization'}`,
    description: `Manage team members, permissions, and roles for ${activeOrg?.name || 'your organization'}.`
  })

  // Loading state
  const isLoading = membersLoading || permissionSetsLoading || rolesLoading

  // Error state
  const error = membersError || permissionSetsError || rolesError

  // Get member counts for tabs
  // For now, we'll consider members with specific permission sets as guests
  // or members with limited permissions as guests
  const regularMembers = membersArray.filter(member =>
    member.role !== 'guest' &&
    (!member.permissionSet || !member.permissionSet.name.toLowerCase().includes('guest'))
  )

  const guestMembers = membersArray.filter(member =>
    member.role === 'guest' ||
    (member.permissionSet && member.permissionSet.name.toLowerCase().includes('guest'))
  )

  if (isLoading) {
    return (
      <>
        <AppHeader
          title="Team Management"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Organizations', href: '/organizations' },
            { label: activeOrg?.name || 'Organization', href: `/organizations/${organizationId}` },
            {
              label: 'Team Management',
              icon: <Users className="w-4 h-4" />,
              isCurrentPage: true
            }
          ]}
        />
        <PageLoadingState message="Loading team management..." />
      </>
    )
  }

  if (error) {
    return (
      <>
        <AppHeader
          title="Team Management"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Organizations', href: '/organizations' },
            { label: activeOrg?.name || 'Organization', href: `/organizations/${organizationId}` },
            {
              label: 'Team Management',
              icon: <Users className="w-4 h-4" />,
              isCurrentPage: true
            }
          ]}
        />
        <PageErrorState
          error={error}
          onRetry={() => window.location.reload()}
          onGoHome={() => window.location.href = '/'}
        />
      </>
    )
  }

  return (
    <>
      <AppHeader
        title="Team Management"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Organizations', href: '/organizations' },
          { label: activeOrg?.name || 'Organization', href: `/organizations/${organizationId}` },
          {
            label: 'Team Management',
            icon: <Users className="w-4 h-4" />,
            isCurrentPage: true
          }
        ]}
        actions={
          <div className="flex items-center gap-1 sm:gap-2">
            <PermissionGuard role={['owner', 'admin']}>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                size="sm"
                onClick={() => setShowInviteDialog(true)}
                aria-label="Add new team member"
                className="touch-target"
              >
                <UserPlus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            </PermissionGuard>
            {currentUserMember && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground touch-target"
                onClick={() => setMemberToRemove(currentUserMember)}
                aria-label="Leave organization"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Leave Organization</span>
              </Button>
            )}
          </div>
        }
      />

      <main id="main-content" className="flex-1 flex flex-col h-full" role="main">
        <div className="px-4 py-6 space-y-6 mobile-spacing">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full gap-1 h-auto p-1 grid-cols-2 sm:grid-cols-5">
              <TabsTrigger
                value="members"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem]"
                aria-label={`Members tab (${regularMembers.length} members)`}
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden xs:inline">Members</span>
                <span className="xs:hidden">M</span>
                {regularMembers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/10 rounded-full shrink-0">
                    {regularMembers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="guests"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem]"
                aria-label={`Guests tab (${guestMembers.length} guests)`}
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden xs:inline">Guests</span>
                <span className="xs:hidden">G</span>
                {guestMembers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/10 rounded-full shrink-0">
                    {guestMembers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="permission-sets"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem]"
                aria-label={`Permission Sets tab (${permissionSets?.length || 0} sets)`}
                disabled={!canManagePermissions}
                style={{ display: canManagePermissions ? 'flex' : 'none' }}
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Permission Sets</span>
                <span className="sm:hidden">Perms</span>
                {permissionSets && permissionSets.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/10 rounded-full shrink-0">
                    {permissionSets.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="custom-roles"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem]"
                aria-label={`Custom Roles tab (${roles?.length || 0} roles)`}
                disabled={!canManagePermissions}
                style={{ display: canManagePermissions ? 'flex' : 'none' }}
              >
                <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Custom Roles</span>
                <span className="sm:hidden">Roles</span>
                {roles && roles.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/10 rounded-full shrink-0">
                    {roles.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="admin-profiles"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem]"
                aria-label="Admin Profile Management"
                disabled={!canManagePermissions}
                style={{ display: canManagePermissions ? 'flex' : 'none' }}
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Profile Admin</span>
                <span className="sm:hidden">Admin</span>
              </TabsTrigger>

            </TabsList>

            <TabsContents className="mt-6">
              <TabsContent value="members" className="space-y-6">
                <SectionErrorBoundary>
                  <MembersTabContent
                    members={regularMembers}
                    pendingInvitations={pendingInvitations}
                    organizationId={organizationId}
                    canManage={canManageMembers}
                    onInviteMember={() => setShowInviteDialog(true)}
                    onMemberRemove={setMemberToRemove}
                    onMemberProfileOpen={handleMemberProfileOpen}
                    onResendInvitation={resendInvitation}
                    onCancelInvitation={cancelInvitation}
                    isResendingInvitation={isResendingInvitation}
                    isCancellingInvitation={isCancellingInvitation}
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                  />
                </SectionErrorBoundary>
              </TabsContent>

              <TabsContent value="guests" className="space-y-6">
                <SectionErrorBoundary>
                  <GuestsTabContent
                    members={guestMembers}
                    organizationId={organizationId}
                    canManage={canManageMembers}
                    onMemberProfileOpen={handleMemberProfileOpen}
                  />
                </SectionErrorBoundary>
              </TabsContent>

              <TabsContent value="permission-sets" className="space-y-6">
                <SectionErrorBoundary>
                  {canManagePermissions ? (
                    <PermissionSetsTabContent
                      organizationId={organizationId}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">You don't have permission to manage permission sets.</p>
                    </div>
                  )}
                </SectionErrorBoundary>
              </TabsContent>

              <TabsContent value="custom-roles" className="space-y-6">
                <SectionErrorBoundary>
                  {canManagePermissions ? (
                    <CustomRolesTabContent
                      organizationId={organizationId}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">You don't have permission to manage custom roles.</p>
                    </div>
                  )}
                </SectionErrorBoundary>
              </TabsContent>

              <TabsContent value="admin-profiles" className="space-y-6">
                <SectionErrorBoundary>
                  {canManagePermissions ? (
                    <AdminProfileManager
                      members={membersArray}
                      organizationId={organizationId}
                      onMemberUpdate={(memberId) => {
                        // Refresh member data
                        // This could trigger a refetch of team members
                      }}
                      onAvatarReset={async (memberId) => {
                        // Handle individual avatar reset
                        const response = await fetch(
                          `/api/organizations/${organizationId}/admin/profiles/${memberId}/avatar/reset`,
                          { method: 'POST' }
                        )
                        if (!response.ok) {
                          throw new Error('Failed to reset avatar')
                        }
                      }}
                      onBulkAvatarReset={async (memberIds) => {
                        // Handle bulk avatar reset
                        const response = await fetch(
                          `/api/organizations/${organizationId}/admin/profiles`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'reset_avatars',
                              memberIds,
                            }),
                          }
                        )
                        if (!response.ok) {
                          throw new Error('Failed to reset avatars')
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">You don't have permission to manage admin profiles.</p>
                    </div>
                  )}
                </SectionErrorBoundary>
              </TabsContent>


            </TabsContents>
          </Tabs>
        </div>
      </main>

      {/* Member Invite Dialog */}
      <MemberInviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        organizationId={organizationId}
      />

      {/* Member Removal Dialog */}
      {memberToRemove && (
        <MemberRemovalDialog
          open={!!memberToRemove}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          organizationId={organizationId}
          member={memberToRemove}
          currentUserId={user?.id || ''}
          isOwnAccount={memberToRemove.userId === user?.id}
        />
      )}

      {/* Member Profile Card */}
      {selectedMemberId && (
        (() => {
          const selectedMember = membersArray.find(m => m.id === selectedMemberId)
          return selectedMember ? (
            <MemberProfileCard
              member={selectedMember}
              isOpen={!!selectedMemberId}
              onClose={handleMemberProfileClose}
              currentUserRole={currentUserMember?.role || 'member'}
              currentUserId={user?.id || ''}
              organizationId={organizationId}
              initialTab={selectedMemberTab}
              onTabChange={(tab) => {
                setSelectedMemberTab(tab)
                const url = new URL(window.location.href)
                if (tab === 'profile') {
                  url.searchParams.delete('memberTab')
                } else {
                  url.searchParams.set('memberTab', tab)
                }
                router.replace(url.pathname + url.search, { scroll: false })
              }}
            />
          ) : null
        })()
      )}
    </>
  )
}

// Members tab content with filtering and table
function MembersTabContent({
  members,
  pendingInvitations,
  organizationId,
  canManage,
  onInviteMember,
  onMemberRemove,
  onMemberProfileOpen,
  onResendInvitation,
  onCancelInvitation,
  isResendingInvitation,
  isCancellingInvitation,
  filters,
  onFiltersChange
}: {
  members: import('@/hooks/useTeamMembers').OrganizationMember[]
  pendingInvitations?: import('@/hooks/useTeamMembers').PendingInvitation[]
  organizationId: string
  canManage: boolean
  onInviteMember?: () => void
  onMemberRemove?: (member: import('@/hooks/useTeamMembers').OrganizationMember) => void
  onMemberProfileOpen?: (memberId: string, tab?: string) => void
  onResendInvitation?: (invitationId: string) => void
  onCancelInvitation?: (invitationId: string) => void
  isResendingInvitation?: boolean
  isCancellingInvitation?: boolean
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
}) {


  const handleMemberClick = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember) => {
    onMemberProfileOpen?.(member.id)
  }, [onMemberProfileOpen])

  const handleMemberEdit = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember) => {
    onMemberProfileOpen?.(member.id, 'profile')
  }, [onMemberProfileOpen])

  const handleMemberRemove = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember) => {
    onMemberRemove?.(member)
  }, [onMemberRemove])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s team members and their roles.
          </p>
        </div>
        {canManage && (
          <Button onClick={onInviteMember}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      <FilterPanel
        organizationId={organizationId}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <MemberTable
        members={members}
        pendingInvitations={pendingInvitations}
        organizationId={organizationId}
        canManage={canManage}
        onMemberClick={handleMemberClick}
        onMemberEdit={handleMemberEdit}
        onMemberRemove={handleMemberRemove}
        onResendInvitation={onResendInvitation}
        onCancelInvitation={onCancelInvitation}
        isResendingInvitation={isResendingInvitation}
        isCancellingInvitation={isCancellingInvitation}
      />
    </div>
  )
}

function GuestsTabContent({
  members,
  organizationId,
  canManage,
  onMemberProfileOpen
}: {
  members: import('@/hooks/useTeamMembers').OrganizationMember[]
  organizationId: string
  canManage: boolean
  onMemberProfileOpen?: (memberId: string, tab?: string) => void
}) {
  const handleMemberClick = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember) => {
    onMemberProfileOpen?.(member.id)
  }, [onMemberProfileOpen])

  const handlePromoteGuest = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember, newRole: 'admin' | 'member') => {
    // TODO: Implement guest promotion
    console.log('Promote guest:', member, 'to', newRole)
  }, [])

  const handleRemoveGuest = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember) => {
    // TODO: Implement guest removal
    console.log('Remove guest:', member)
  }, [])

  return (
    <GuestsTab
      members={members}
      organizationId={organizationId}
      canManage={canManage}
      onMemberClick={handleMemberClick}
      onPromoteGuest={handlePromoteGuest}
      onRemoveGuest={handleRemoveGuest}
    />
  )
}

function PermissionSetsTabContent({
  organizationId
}: {
  organizationId: string
}) {
  return <PermissionSetManager organizationId={organizationId} />
}

function CustomRolesTabContent({
  organizationId
}: {
  organizationId: string
}) {
  return <RoleManager organizationId={organizationId} />
}