import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamManagementPage } from '@/components/team-management/TeamManagementPage'

// Mock hooks
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: vi.fn(),
}))

vi.mock('@/hooks/usePermissionSets', () => ({
  usePermissionSets: vi.fn(),
}))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

vi.mock('@/hooks/useActiveOrg', () => ({
  useActiveOrg: vi.fn(),
}))

import { useTeamMembers } from '@/hooks/useTeamMembers'
import { usePermissionSets } from '@/hooks/usePermissionSets'
import { usePermissions } from '@/hooks/usePermissions'
import { useActiveOrg } from '@/hooks/useActiveOrg'

describe('TeamManagementPage', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
  }

  const mockMembers = [
    {
      id: 'member-1',
      organizationId: 'org-123',
      userId: 'user-1',
      role: 'admin',
      jobTitle: 'Developer',
      workingHoursPerWeek: 40,
      joinDate: new Date('2024-01-01'),
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: null,
      },
      permissionSet: null,
      engagements: [],
      timeOffEntries: [],
      profileData: null,
    },
    {
      id: 'member-2',
      organizationId: 'org-123',
      userId: 'user-2',
      role: 'member',
      jobTitle: 'Designer',
      workingHoursPerWeek: 35,
      joinDate: new Date('2024-02-01'),
      user: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        avatar_url: null,
      },
      permissionSet: null,
      engagements: [],
      timeOffEntries: [],
      profileData: null,
    },
  ]

  const mockPermissionSets = [
    {
      id: 'perm-1',
      organizationId: 'org-123',
      name: 'Custom Admin',
      permissions: {
        teamMembers: { viewAll: true, manageAll: true },
        projects: { viewAll: true, manageAll: false, viewAssigned: true, manageAssigned: true },
      },
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
    },
  ]

  const mockPermissions = {
    canViewMembers: true,
    canManageMembers: true,
    canViewPermissionSets: true,
    canManagePermissionSets: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useActiveOrg).mockReturnValue({
      organization: mockOrganization,
      isLoading: false,
      error: null,
    })

    vi.mocked(useTeamMembers).mockReturnValue({
      members: mockMembers,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    })

    vi.mocked(usePermissionSets).mockReturnValue({
      permissionSets: mockPermissionSets,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
      createPermissionSet: vi.fn(),
      updatePermissionSet: vi.fn(),
      deletePermissionSet: vi.fn(),
    })

    vi.mocked(usePermissions).mockReturnValue(mockPermissions)
  })

  it('should render the team management page with tabs', () => {
    render(<TeamManagementPage />)

    expect(screen.getByText('Team Management')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /guests/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /permission sets/i })).toBeInTheDocument()
  })

  it('should display members tab by default', () => {
    render(<TeamManagementPage />)

    expect(screen.getByRole('tab', { name: /members/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should switch to guests tab when clicked', async () => {
    const user = userEvent.setup()
    render(<TeamManagementPage />)

    const guestsTab = screen.getByRole('tab', { name: /guests/i })
    await user.click(guestsTab)

    expect(guestsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('should switch to permission sets tab when clicked', async () => {
    const user = userEvent.setup()
    render(<TeamManagementPage />)

    const permissionSetsTab = screen.getByRole('tab', { name: /permission sets/i })
    await user.click(permissionSetsTab)

    expect(permissionSetsTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Custom Admin')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    vi.mocked(useTeamMembers).mockReturnValue({
      members: [],
      isLoading: true,
      error: null,
      mutate: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    })

    render(<TeamManagementPage />)

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('should show error state', () => {
    vi.mocked(useTeamMembers).mockReturnValue({
      members: [],
      isLoading: false,
      error: new Error('Failed to load members'),
      mutate: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    })

    render(<TeamManagementPage />)

    expect(screen.getByText(/failed to load members/i)).toBeInTheDocument()
  })

  it('should hide tabs based on permissions', () => {
    vi.mocked(usePermissions).mockReturnValue({
      canViewMembers: true,
      canManageMembers: false,
      canViewPermissionSets: false,
      canManagePermissionSets: false,
    })

    render(<TeamManagementPage />)

    expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /permission sets/i })).not.toBeInTheDocument()
  })

  it('should show add member button for users with manage permissions', () => {
    render(<TeamManagementPage />)

    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument()
  })

  it('should hide add member button for users without manage permissions', () => {
    vi.mocked(usePermissions).mockReturnValue({
      ...mockPermissions,
      canManageMembers: false,
    })

    render(<TeamManagementPage />)

    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument()
  })

  it('should open member invite dialog when add member is clicked', async () => {
    const user = userEvent.setup()
    render(<TeamManagementPage />)

    const addButton = screen.getByRole('button', { name: /add member/i })
    await user.click(addButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/invite member/i)).toBeInTheDocument()
  })

  it('should filter members based on search input', async () => {
    const user = userEvent.setup()
    render(<TeamManagementPage />)

    const searchInput = screen.getByPlaceholderText(/search members/i)
    await user.type(searchInput, 'john')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('should show member count', () => {
    render(<TeamManagementPage />)

    expect(screen.getByText(/2 members/i)).toBeInTheDocument()
  })

  it('should handle organization loading state', () => {
    vi.mocked(useActiveOrg).mockReturnValue({
      organization: null,
      isLoading: true,
      error: null,
    })

    render(<TeamManagementPage />)

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('should handle organization error state', () => {
    vi.mocked(useActiveOrg).mockReturnValue({
      organization: null,
      isLoading: false,
      error: new Error('Organization not found'),
    })

    render(<TeamManagementPage />)

    expect(screen.getByText(/organization not found/i)).toBeInTheDocument()
  })

  it('should refresh data when refresh button is clicked', async () => {
    const mockMutate = vi.fn()
    vi.mocked(useTeamMembers).mockReturnValue({
      members: mockMembers,
      isLoading: false,
      error: null,
      mutate: mockMutate,
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    })

    const user = userEvent.setup()
    render(<TeamManagementPage />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    expect(mockMutate).toHaveBeenCalled()
  })

  it('should handle keyboard navigation between tabs', async () => {
    const user = userEvent.setup()
    render(<TeamManagementPage />)

    const membersTab = screen.getByRole('tab', { name: /members/i })
    const guestsTab = screen.getByRole('tab', { name: /guests/i })

    await user.click(membersTab)
    await user.keyboard('{ArrowRight}')

    expect(guestsTab).toHaveFocus()
  })

  it('should maintain tab state when switching between tabs', async () => {
    const user = userEvent.setup()
    render(<TeamManagementPage />)

    // Search in members tab
    const searchInput = screen.getByPlaceholderText(/search members/i)
    await user.type(searchInput, 'john')

    // Switch to guests tab
    const guestsTab = screen.getByRole('tab', { name: /guests/i })
    await user.click(guestsTab)

    // Switch back to members tab
    const membersTab = screen.getByRole('tab', { name: /members/i })
    await user.click(membersTab)

    // Search should be preserved
    expect(searchInput).toHaveValue('john')
  })

  it('should show breadcrumb navigation', () => {
    render(<TeamManagementPage />)

    expect(screen.getByText('Test Organization')).toBeInTheDocument()
    expect(screen.getByText('Team Management')).toBeInTheDocument()
  })

  it('should be accessible with proper ARIA labels', () => {
    render(<TeamManagementPage />)

    const tabList = screen.getByRole('tablist')
    expect(tabList).toHaveAttribute('aria-label', 'Team management sections')

    const membersTab = screen.getByRole('tab', { name: /members/i })
    expect(membersTab).toHaveAttribute('aria-controls')
    expect(membersTab).toHaveAttribute('aria-selected')
  })
})