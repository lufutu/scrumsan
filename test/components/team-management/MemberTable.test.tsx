import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberTable } from '@/components/team-management/MemberTable'

// Mock hooks
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

import { usePermissions } from '@/hooks/usePermissions'

describe('MemberTable', () => {
  const mockMembers = [
    {
      id: 'member-1',
      organizationId: 'org-123',
      userId: 'user-1',
      role: 'admin',
      jobTitle: 'Senior Developer',
      workingHoursPerWeek: 40,
      joinDate: new Date('2024-01-01'),
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar1.jpg',
      },
      permissionSet: null,
      engagements: [
        {
          id: 'eng-1',
          projectId: 'project-1',
          role: 'Lead Developer',
          hoursPerWeek: 25,
          isActive: true,
          startDate: new Date('2024-01-01'),
          endDate: null,
          project: { id: 'project-1', name: 'Project Alpha' },
        },
      ],
      timeOffEntries: [
        {
          id: 'timeoff-1',
          type: 'vacation',
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-07-10'),
          status: 'approved',
        },
      ],
      profileData: null,
    },
    {
      id: 'member-2',
      organizationId: 'org-123',
      userId: 'user-2',
      role: 'member',
      jobTitle: 'UI Designer',
      workingHoursPerWeek: 35,
      joinDate: new Date('2024-02-01'),
      user: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        avatar_url: null,
      },
      permissionSet: {
        id: 'perm-1',
        name: 'Designer',
        permissions: {},
      },
      engagements: [
        {
          id: 'eng-2',
          projectId: 'project-2',
          role: 'Designer',
          hoursPerWeek: 20,
          isActive: true,
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-08-31'),
          project: { id: 'project-2', name: 'Project Beta' },
        },
      ],
      timeOffEntries: [],
      profileData: null,
    },
    {
      id: 'member-3',
      organizationId: 'org-123',
      userId: 'user-3',
      role: 'guest',
      jobTitle: null,
      workingHoursPerWeek: 0,
      joinDate: new Date('2024-03-01'),
      user: {
        id: 'user-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        avatar_url: null,
      },
      permissionSet: null,
      engagements: [],
      timeOffEntries: [],
      profileData: null,
    },
  ]

  const mockPermissions = {
    canViewMembers: true,
    canManageMembers: true,
    canViewMemberProfiles: true,
    canEditMemberProfiles: true,
  }

  const mockProps = {
    members: mockMembers,
    isLoading: false,
    onMemberClick: vi.fn(),
    onMemberEdit: vi.fn(),
    onMemberRemove: vi.fn(),
    filters: {},
    onFiltersChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePermissions).mockReturnValue(mockPermissions)
  })

  it('should render member table with all members', () => {
    render(<MemberTable {...mockProps} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
  })

  it('should display member information correctly', () => {
    render(<MemberTable {...mockProps} />)

    // Check member details
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    
    // Check engagement information
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('25h/week')).toBeInTheDocument()
    
    // Check availability
    expect(screen.getByText('15h available')).toBeInTheDocument() // 40 - 25
  })

  it('should show loading state', () => {
    render(<MemberTable {...mockProps} isLoading={true} />)

    expect(screen.getByTestId('member-table-skeleton')).toBeInTheDocument()
  })

  it('should handle empty member list', () => {
    render(<MemberTable {...mockProps} members={[]} />)

    expect(screen.getByText(/no members found/i)).toBeInTheDocument()
  })

  it('should call onMemberClick when member row is clicked', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const memberRow = screen.getByText('John Doe').closest('tr')
    await user.click(memberRow!)

    expect(mockProps.onMemberClick).toHaveBeenCalledWith(mockMembers[0])
  })

  it('should show member actions menu', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const actionsButton = screen.getAllByRole('button', { name: /actions/i })[0]
    await user.click(actionsButton)

    expect(screen.getByText(/edit profile/i)).toBeInTheDocument()
    expect(screen.getByText(/remove member/i)).toBeInTheDocument()
  })

  it('should call onMemberEdit when edit action is clicked', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const actionsButton = screen.getAllByRole('button', { name: /actions/i })[0]
    await user.click(actionsButton)

    const editButton = screen.getByText(/edit profile/i)
    await user.click(editButton)

    expect(mockProps.onMemberEdit).toHaveBeenCalledWith(mockMembers[0])
  })

  it('should call onMemberRemove when remove action is clicked', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const actionsButton = screen.getAllByRole('button', { name: /actions/i })[0]
    await user.click(actionsButton)

    const removeButton = screen.getByText(/remove member/i)
    await user.click(removeButton)

    expect(mockProps.onMemberRemove).toHaveBeenCalledWith(mockMembers[0])
  })

  it('should hide actions for users without manage permissions', () => {
    vi.mocked(usePermissions).mockReturnValue({
      ...mockPermissions,
      canManageMembers: false,
    })

    render(<MemberTable {...mockProps} />)

    expect(screen.queryByRole('button', { name: /actions/i })).not.toBeInTheDocument()
  })

  it('should sort members by name when name column header is clicked', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const nameHeader = screen.getByText('Name')
    await user.click(nameHeader)

    // Check if sorting indicator is shown
    expect(screen.getByTestId('sort-indicator')).toBeInTheDocument()
  })

  it('should filter members by role', () => {
    const filteredProps = {
      ...mockProps,
      filters: { role: 'admin' },
    }

    render(<MemberTable {...filteredProps} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument()
  })

  it('should show member avatars', () => {
    render(<MemberTable {...mockProps} />)

    const avatar = screen.getByAltText('John Doe avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar1.jpg')
  })

  it('should show default avatar for members without avatar', () => {
    render(<MemberTable {...mockProps} />)

    const defaultAvatar = screen.getByText('JS') // Jane Smith initials
    expect(defaultAvatar).toBeInTheDocument()
  })

  it('should display permission set names', () => {
    render(<MemberTable {...mockProps} />)

    expect(screen.getByText('Designer')).toBeInTheDocument()
  })

  it('should show engagement status indicators', () => {
    render(<MemberTable {...mockProps} />)

    // Active engagement indicator
    expect(screen.getByTestId('active-engagement-indicator')).toBeInTheDocument()
    
    // Availability status
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('should display time-off information', () => {
    render(<MemberTable {...mockProps} />)

    expect(screen.getByText('1 upcoming')).toBeInTheDocument() // Time-off entries
  })

  it('should handle member with no engagements', () => {
    render(<MemberTable {...mockProps} />)

    // Bob Wilson (guest) has no engagements
    const bobRow = screen.getByText('Bob Wilson').closest('tr')
    expect(bobRow).toContainHTML('No active engagements')
  })

  it('should show overallocated members with warning', () => {
    const overallocatedMember = {
      ...mockMembers[0],
      engagements: [
        {
          id: 'eng-1',
          projectId: 'project-1',
          role: 'Developer',
          hoursPerWeek: 50, // Exceeds 40h working hours
          isActive: true,
          startDate: new Date('2024-01-01'),
          endDate: null,
          project: { id: 'project-1', name: 'Project Alpha' },
        },
      ],
    }

    render(<MemberTable {...mockProps} members={[overallocatedMember]} />)

    expect(screen.getByText('Overallocated')).toBeInTheDocument()
    expect(screen.getByTestId('overallocation-warning')).toBeInTheDocument()
  })

  it('should be accessible with proper ARIA labels', () => {
    render(<MemberTable {...mockProps} />)

    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('aria-label', 'Team members')

    const columnHeaders = screen.getAllByRole('columnheader')
    expect(columnHeaders[0]).toHaveAttribute('aria-sort')
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const firstRow = screen.getByText('John Doe').closest('tr')
    await user.click(firstRow!)
    
    await user.keyboard('{ArrowDown}')
    
    // Should focus next row
    const secondRow = screen.getByText('Jane Smith').closest('tr')
    expect(secondRow).toHaveFocus()
  })

  it('should show pagination when there are many members', () => {
    const manyMembers = Array.from({ length: 25 }, (_, i) => ({
      ...mockMembers[0],
      id: `member-${i}`,
      user: { ...mockMembers[0].user, id: `user-${i}`, name: `User ${i}` },
    }))

    render(<MemberTable {...mockProps} members={manyMembers} />)

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('should handle search filtering', async () => {
    const user = userEvent.setup()
    render(<MemberTable {...mockProps} />)

    const searchInput = screen.getByPlaceholderText(/search members/i)
    await user.type(searchInput, 'john')

    await waitFor(() => {
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        search: 'john',
      })
    })
  })

  it('should show member join date', () => {
    render(<MemberTable {...mockProps} />)

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument() // John's join date
  })

  it('should display working hours per week', () => {
    render(<MemberTable {...mockProps} />)

    expect(screen.getByText('40h/week')).toBeInTheDocument() // John's working hours
    expect(screen.getByText('35h/week')).toBeInTheDocument() // Jane's working hours
  })
})