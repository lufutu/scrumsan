'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, UserPlus, Shield, Settings, Briefcase, LogOut, Sparkles, TrendingUp, Clock, Award } from 'lucide-react'
import { AppHeader } from '@/components/dashboard/app-header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageLoadingState } from '@/components/ui/loading-state'
import { PageErrorState } from '@/components/ui/error-state'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/ui/error-boundary'
import { useOrganization } from '@/providers/organization-provider'
import { useSupabase } from '@/providers/supabase-provider'
import { useTeamMembers, FilterOptions } from '@/hooks/useTeamMembers'
import { usePermissionSets } from '@/hooks/usePermissionSets'
import { useCustomRoles } from '@/hooks/useCustomRoles'
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
import { 
  pageTransition, 
  staggerContainer, 
  staggerItem, 
  tabContent,
  cardHover,
  floatingButton,
  successBounce,
  loadingPulse
} from './animations'

interface TeamManagementPageProps {
  organizationId: string
}

export function EnhancedTeamManagementPage({ organizationId }: TeamManagementPageProps) {
  return (
    <PageErrorBoundary>
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageTransition}
        className="min-h-screen"
      >
        <TeamManagementPageContent organizationId={organizationId} />
      </motion.div>
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

  // Fetch team members with performance optimizations
  const { 
    members, 
    isLoading: membersLoading, 
    error: membersError,
  } = useTeamMembers(organizationId, debouncedFilters, {
    enableOptimisticUpdates: true,
  })
  
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

  // Check user permissions
  const currentUserMember = members?.find(member => member.userId === user?.id)
  const canManageMembers = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
  const canManagePermissions = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (!members) return null

    const totalMembers = members.length
    const activeMembers = members.filter(m => m.engagements.some(e => e.isActive)).length
    const totalHours = members.reduce((sum, m) => sum + (m.workingHoursPerWeek || 0), 0)
    const engagedHours = members.reduce((sum, m) => 
      sum + m.engagements.filter(e => e.isActive).reduce((eSum, e) => eSum + e.hoursPerWeek, 0), 0
    )
    const utilizationRate = totalHours > 0 ? (engagedHours / totalHours) * 100 : 0

    return {
      totalMembers,
      activeMembers,
      totalHours,
      engagedHours,
      availableHours: totalHours - engagedHours,
      utilizationRate
    }
  }, [members])

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
  const regularMembers = members?.filter(member => 
    member.role !== 'guest' && 
    (!member.permissionSet || !member.permissionSet.name.toLowerCase().includes('guest'))
  ) || []
  
  const guestMembers = members?.filter(member => 
    member.role === 'guest' || 
    (member.permissionSet && member.permissionSet.name.toLowerCase().includes('guest'))
  ) || []

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
        <motion.div
          variants={loadingPulse}
          animate="animate"
          className="flex-1 flex items-center justify-center"
        >
          <PageLoadingState message="Loading team management..." />
        </motion.div>
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
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
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
          <motion.div 
            className="flex items-center gap-1 sm:gap-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {canManageMembers && (
              <>
                <motion.div variants={staggerItem}>
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <Button 
                    size="sm" 
                    onClick={() => setShowInviteDialog(true)}
                    aria-label="Add new team member"
                    className="touch-target relative overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <UserPlus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Member</span>
                    <motion.div
                      className="absolute inset-0 bg-white/20 rounded-md"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                  </Button>
                </motion.div>
              </>
            )}
            {currentUserMember && (
              <motion.div variants={staggerItem}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground touch-target"
                  onClick={() => setMemberToRemove(currentUserMember)}
                  aria-label="Leave organization"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Leave Organization</span>
                </Button>
              </motion.div>
            )}
          </motion.div>
        }
      />

      <main id="main-content" className="flex-1 flex flex-col h-full" role="main">
        <div className="px-4 py-6 space-y-6 mobile-spacing">
          {/* Team Statistics Cards */}
          {teamStats && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            >
              <motion.div variants={staggerItem}>
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      {teamStats.totalMembers}
                    </motion.div>
                    <p className="text-xs text-muted-foreground">
                      {teamStats.activeMembers} actively engaged
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      {Math.round(teamStats.utilizationRate)}%
                    </motion.div>
                    <div className="mt-2">
                      <Progress 
                        value={teamStats.utilizationRate} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                    >
                      {teamStats.totalHours}
                    </motion.div>
                    <p className="text-xs text-muted-foreground">
                      {teamStats.availableHours} hours available
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Permission Sets</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-2xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      {permissionSets?.length || 0}
                    </motion.div>
                    <p className="text-xs text-muted-foreground">
                      {roles?.length || 0} custom roles
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1 bg-muted/50 backdrop-blur-sm">
                <TabsTrigger 
                  value="members" 
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem] relative overflow-hidden group"
                  aria-label={`Members tab (${regularMembers.length} members)`}
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden xs:inline">Members</span>
                  <span className="xs:hidden">M</span>
                  {regularMembers.length > 0 && (
                    <motion.span 
                      className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {regularMembers.length}
                    </motion.span>
                  )}
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-md opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                </TabsTrigger>
                
                <TabsTrigger 
                  value="guests" 
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem] relative overflow-hidden group"
                  aria-label={`Guests tab (${guestMembers.length} guests)`}
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden xs:inline">Guests</span>
                  <span className="xs:hidden">G</span>
                  {guestMembers.length > 0 && (
                    <motion.span 
                      className="ml-1 px-1.5 py-0.5 text-xs bg-secondary/10 text-secondary-foreground rounded-full shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {guestMembers.length}
                    </motion.span>
                  )}
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-md opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                </TabsTrigger>
                
                <TabsTrigger 
                  value="permission-sets" 
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem] relative overflow-hidden group"
                  disabled={!canManagePermissions}
                  aria-label={`Permission Sets tab (${permissionSets?.length || 0} sets)`}
                >
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Permission Sets</span>
                  <span className="sm:hidden">Perms</span>
                  {permissionSets && permissionSets.length > 0 && (
                    <motion.span 
                      className="ml-1 px-1.5 py-0.5 text-xs bg-accent/10 text-accent-foreground rounded-full shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {permissionSets.length}
                    </motion.span>
                  )}
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-md opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                </TabsTrigger>
                
                <TabsTrigger 
                  value="custom-roles" 
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[2.5rem] relative overflow-hidden group"
                  disabled={!canManagePermissions}
                  aria-label={`Custom Roles tab (${roles?.length || 0} roles)`}
                >
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Custom Roles</span>
                  <span className="sm:hidden">Roles</span>
                  {roles && roles.length > 0 && (
                    <motion.span 
                      className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/10 rounded-full shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      {roles.length}
                    </motion.span>
                  )}
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-md opacity-0 group-hover:opacity-100"
                    transition={{ duration: 0.2 }}
                  />
                </TabsTrigger>
              </TabsList>
            </motion.div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabContent}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <TabsContent value="members" className="space-y-6">
                    <SectionErrorBoundary>
                      <MembersTabContent 
                        members={regularMembers}
                        organizationId={organizationId}
                        canManage={canManageMembers}
                        onInviteMember={() => setShowInviteDialog(true)}
                        onMemberRemove={setMemberToRemove}
                        onMemberProfileOpen={handleMemberProfileOpen}
                        filters={filters}
                        onFiltersChange={setFilters}
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
                    {canManagePermissions ? (
                      <SectionErrorBoundary>
                        <PermissionSetsTabContent 
                          organizationId={organizationId}
                        />
                      </SectionErrorBoundary>
                    ) : (
                      <motion.div 
                        className="text-center py-12"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">
                          Access Restricted
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          You don&apos;t have permission to manage permission sets.
                        </p>
                      </motion.div>
                    )}
                  </TabsContent>

                  <TabsContent value="custom-roles" className="space-y-6">
                    {canManagePermissions ? (
                      <SectionErrorBoundary>
                        <CustomRolesTabContent 
                          organizationId={organizationId}
                        />
                      </SectionErrorBoundary>
                    ) : (
                      <motion.div 
                        className="text-center py-12"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">
                          Access Restricted
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          You don&apos;t have permission to manage custom roles.
                        </p>
                      </motion.div>
                    )}
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      {canManageMembers && (
        <motion.div
          className="fixed bottom-6 right-6 sm:hidden z-50"
          variants={floatingButton}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
        >
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg"
            onClick={() => setShowInviteDialog(true)}
            aria-label="Add new team member"
          >
            <UserPlus className="w-6 h-6" />
          </Button>
        </motion.div>
      )}

      {/* Dialogs with enhanced animations */}
      <AnimatePresence>
        {showInviteDialog && (
          <MemberInviteDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            organizationId={organizationId}
          />
        )}

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

        {selectedMemberId && (
          (() => {
            const selectedMember = members?.find(m => m.id === selectedMemberId)
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
      </AnimatePresence>
    </>
  )
}

// Enhanced Members tab content with animations
function MembersTabContent({ 
  members, 
  organizationId, 
  canManage,
  onInviteMember,
  onMemberRemove,
  onMemberProfileOpen,
  filters,
  onFiltersChange
}: { 
  members: import('@/hooks/useTeamMembers').OrganizationMember[]
  organizationId: string
  canManage: boolean
  onInviteMember?: () => void
  onMemberRemove?: (member: import('@/hooks/useTeamMembers').OrganizationMember) => void
  onMemberProfileOpen?: (memberId: string, tab?: string) => void
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
    <motion.div 
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div 
        className="flex items-center justify-between"
        variants={staggerItem}
      >
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            Team Members
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s team members and their roles.
          </p>
        </div>
        {canManage && (
          <motion.div variants={staggerItem}>
            <Button 
              onClick={onInviteMember}
              className="relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
              <motion.div
                className="absolute inset-0 bg-white/20 rounded-md"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
            </Button>
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={staggerItem}>
        <FilterPanel
          organizationId={organizationId}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <MemberTable
          members={members || []}
          organizationId={organizationId}
          canManage={canManage}
          onMemberClick={handleMemberClick}
          onMemberEdit={handleMemberEdit}
          onMemberRemove={handleMemberRemove}
        />
      </motion.div>
    </motion.div>
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
    console.log('Promote guest:', member, 'to', newRole)
  }, [])

  const handleRemoveGuest = useCallback((member: import('@/hooks/useTeamMembers').OrganizationMember) => {
    console.log('Remove guest:', member)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <GuestsTab
        members={members}
        organizationId={organizationId}
        canManage={canManage}
        onMemberClick={handleMemberClick}
        onPromoteGuest={handlePromoteGuest}
        onRemoveGuest={handleRemoveGuest}
      />
    </motion.div>
  )
}

function PermissionSetsTabContent({ 
  organizationId 
}: { 
  organizationId: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <PermissionSetManager organizationId={organizationId} />
    </motion.div>
  )
}

function CustomRolesTabContent({ 
  organizationId 
}: { 
  organizationId: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <RoleManager organizationId={organizationId} />
    </motion.div>
  )
}