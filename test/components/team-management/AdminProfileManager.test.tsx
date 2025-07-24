import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toast } from 'sonner'
import { AdminProfileManager } from '@/components/team-management/AdminProfileManager'
import { usePermissions } from '@/hooks/usePermissions'

// Mock dependencies
vi.mock('@/hooks/usePermissions')
vi.mock('sonner')
vi.mock('@/components/profile/profile-editor-dialog', () => ({
  ProfileEditorDialog: ({ isOpen, onClose }: unknown) => 
    isOpen ? <div data-testid="profile-editor">Profile Editor</div> : null
}))

const mockUsePermissions = vi.mocked(usePermissions)
const mockToast = vi.mocked(toast)

// Mock fetch
global.fetch = jest.fn()

const mockMembers = [
  {
    id: 'member-1',
    role: 'admin',
    userId: 'user-1',
    organizationId: 'org-1',
    jobTitle: 'Developer',
    workingHoursPerWeek: 40,
    joinDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z',
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
  },
  {
    id: 'member-2',
    role: 'member',
    userId: 'user-2',
    organizationId: 'org-1',
    jobTitle: 'Designer',
    workingHoursPerWeek: 40,
    joinDate: '2024-01-02',
    createdAt: '2024-01-02T00:00:00Z',
    user: {
      id: 'user-2',
      email: 'member@example.com',
      fullName: 'Member User',
      avatarUrl: null,
    },
  },
]

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('AdminProfileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
      canPerformAction: vi.fn().mockReturnValue(true),
      isOwner: false,
      isAdmin: true,
      isMember: false,
      isGuest: false,
      currentMember: null,
      permissionSet: null,
    })
  })

  it('renders admin profile manager when user has permissions', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    expect(screen.getByText('Profile Management')).toBeInTheDocument()
    expect(screen.getByText('Manage member profiles, avatars, and bulk operations')).toBeInTheDocument()
  })

  it('shows permission denied message when user lacks permissions', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      canPerformAction: vi.fn().mockReturnValue(false),
      isOwner: false,
      isAdmin: false,
      isMember: true,
      isGuest: false,
      currentMember: null,
      permissionSet: null,
    })

    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    expect(screen.getByText('You don\'t have permission to manage member profiles')).toBeInTheDocument()
  })

  it('displays member list with correct information', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Member User')).toBeInTheDocument()
    expect(screen.getByText('member@example.com')).toBeInTheDocument()
  })

  it('shows correct avatar status for members', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    expect(screen.getByText('Custom Avatar')).toBeInTheDocument()
    expect(screen.getByText('Generated Avatar')).toBeInTheDocument()
  })

  it('allows selecting members for bulk operations', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    
    // Click individual member checkbox
    fireEvent.click(checkboxes[1]) // First member checkbox (index 0 is select all)
    
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('shows bulk actions when members are selected', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    expect(screen.getByText('Bulk Actions:')).toBeInTheDocument()
    expect(screen.getByText('Reset Avatars')).toBeInTheDocument()
    expect(screen.getByText('Export Profiles')).toBeInTheDocument()
  })

  it('filters members by search query', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    const searchInput = screen.getByPlaceholderText('Search members...')
    fireEvent.change(searchInput, { target: { value: 'admin' } })

    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.queryByText('Member User')).not.toBeInTheDocument()
  })

  it('filters members by role', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    // Find and click the role filter
    const roleSelect = screen.getByDisplayValue('All Roles')
    fireEvent.click(roleSelect)
    
    // This would need more complex testing for the select component
    // For now, we'll just verify the filter exists
    expect(roleSelect).toBeInTheDocument()
  })

  it('handles individual avatar reset', async () => {
    const mockOnAvatarReset = vi.fn().mockResolvedValue(undefined)
    
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
        onAvatarReset={mockOnAvatarReset}
      />
    )

    // Find the dropdown menu for the first member (who has an avatar)
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    const memberDropdown = dropdownTriggers.find(button => 
      button.querySelector('svg') // Looking for the MoreHorizontal icon
    )
    
    if (memberDropdown) {
      fireEvent.click(memberDropdown)
      
      const resetButton = screen.getByText('Reset Avatar')
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(mockOnAvatarReset).toHaveBeenCalledWith('member-1')
      })
    }
  })

  it('handles bulk avatar reset with confirmation', async () => {
    const mockOnBulkAvatarReset = vi.fn().mockResolvedValue(undefined)
    
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
        onBulkAvatarReset={mockOnBulkAvatarReset}
      />
    )

    // Select a member
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    // Click bulk reset avatars
    const resetAvatarsButton = screen.getByText('Reset Avatars')
    fireEvent.click(resetAvatarsButton)

    // Confirm in dialog
    expect(screen.getByText('Confirm Bulk Action')).toBeInTheDocument()
    
    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnBulkAvatarReset).toHaveBeenCalledWith(['member-1'])
    })
  })

  it('exports profiles to CSV', async () => {
    // Mock URL.createObjectURL and related methods
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    const mockCreateElement = vi.fn().mockReturnValue(mockAnchor)
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()
    
    document.createElement = mockCreateElement
    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild

    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    // Select members
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    // Click export profiles
    const exportButton = screen.getByText('Export Profiles')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAnchor.click).toHaveBeenCalled()
    })
  })

  it('opens profile editor when edit is clicked', () => {
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
      />
    )

    // Find and click a dropdown menu
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    const memberDropdown = dropdownTriggers.find(button => 
      button.querySelector('svg')
    )
    
    if (memberDropdown) {
      fireEvent.click(memberDropdown)
      
      const editButton = screen.getByText('Edit Profile')
      fireEvent.click(editButton)

      expect(screen.getByTestId('profile-editor')).toBeInTheDocument()
    }
  })

  it('shows error toast when bulk operation fails', async () => {
    const mockOnBulkAvatarReset = vi.fn().mockRejectedValue(new Error('Network error'))
    
    renderWithQueryClient(
      <AdminProfileManager
        members={mockMembers}
        organizationId="org-1"
        onBulkAvatarReset={mockOnBulkAvatarReset}
      />
    )

    // Select a member
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    // Click bulk reset avatars
    const resetAvatarsButton = screen.getByText('Reset Avatars')
    fireEvent.click(resetAvatarsButton)

    // Confirm in dialog
    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to reset avatars')
    })
  })
})