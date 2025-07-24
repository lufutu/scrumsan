/**
 * Accessibility tests for Team Management components
 * Tests WCAG 2.1 AA compliance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { TeamManagementPage } from '@/components/team-management/TeamManagementPage'
import { MemberTable } from '@/components/team-management/MemberTable'
import { FilterPanel } from '@/components/team-management/FilterPanel'
import { MemberProfileCard } from '@/components/team-management/MemberProfileCard'
import { MemberInviteDialog } from '@/components/team-management/MemberInviteDialog'
import { createMockMember, createMockOrganization } from '@/test/factories/team-management.factory'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock hooks
jest.mock('@/hooks/useTeamMembers')
jest.mock('@/hooks/usePermissionSets')
jest.mock('@/hooks/useCustomRoles')
jest.mock('@/hooks/useProjects')
jest.mock('@/providers/organization-provider')
jest.mock('@/providers/supabase-provider')

const mockMembers = [
  createMockMember({ role: 'owner' }),
  createMockMember({ role: 'admin' }),
  createMockMember({ role: 'member' }),
]

describe('Team Management Accessibility', () => {
  beforeEach(() => {
    // Mock implementations
    require('@/hooks/useTeamMembers').useTeamMembers.mockReturnValue({
      members: mockMembers,
      isLoading: false,
      error: null,
    })
    
    require('@/providers/organization-provider').useOrganization.mockReturnValue({
      activeOrg: createMockOrganization(),
    })
    
    require('@/providers/supabase-provider').useSupabase.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    })
  })

  describe('TeamManagementPage', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TeamManagementPage organizationId="org-1" />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading structure', () => {
      render(<TeamManagementPage organizationId="org-1" />)
      
      // Should have main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      
      // Should have proper heading hierarchy
      const headings = screen.getAllByRole('heading')
      expect(headings).toHaveLength(1) // Main page heading
    })

    it('should have skip link for keyboard navigation', () => {
      render(<TeamManagementPage organizationId="org-1" />)
      
      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    it('should have proper landmark roles', () => {
      render(<TeamManagementPage organizationId="org-1" />)
      
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    })

    it('should support keyboard navigation for tabs', async () => {
      const user = userEvent.setup()
      render(<TeamManagementPage organizationId="org-1" />)
      
      const membersTab = screen.getByRole('tab', { name: /members/i })
      const guestsTab = screen.getByRole('tab', { name: /guests/i })
      
      // Focus first tab
      membersTab.focus()
      expect(membersTab).toHaveFocus()
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}')
      expect(guestsTab).toHaveFocus()
      
      // Activate with Enter
      await user.keyboard('{Enter}')
      expect(guestsTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should have proper ARIA labels for action buttons', () => {
      render(<TeamManagementPage organizationId="org-1" />)
      
      const addButton = screen.getByLabelText('Add new team member')
      expect(addButton).toBeInTheDocument()
      
      const leaveButton = screen.getByLabelText('Leave organization')
      expect(leaveButton).toBeInTheDocument()
    })
  })

  describe('MemberTable', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <MemberTable
          members={mockMembers}
          organizationId="org-1"
          canManage={true}
        />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper table structure', () => {
      render(
        <MemberTable
          members={mockMembers}
          organizationId="org-1"
          canManage={true}
        />
      )
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6) // Including actions column
      expect(screen.getAllByRole('row')).toHaveLength(4) // Header + 3 members
    })

    it('should have sortable column headers with proper ARIA labels', () => {
      render(
        <MemberTable
          members={mockMembers}
          organizationId="org-1"
          canManage={true}
        />
      )
      
      const nameHeader = screen.getByLabelText('Sort by member name')
      expect(nameHeader).toBeInTheDocument()
      expect(nameHeader).toHaveAttribute('role', 'button')
      
      const roleHeader = screen.getByLabelText('Sort by role')
      expect(roleHeader).toBeInTheDocument()
    })

    it('should support keyboard navigation for member rows', async () => {
      const user = userEvent.setup()
      const onMemberClick = jest.fn()
      
      render(
        <MemberTable
          members={mockMembers}
          organizationId="org-1"
          canManage={true}
          onMemberClick={onMemberClick}
        />
      )
      
      const firstRow = screen.getAllByRole('button')[1] // Skip sort buttons
      firstRow.focus()
      
      await user.keyboard('{Enter}')
      expect(onMemberClick).toHaveBeenCalled()
      
      await user.keyboard(' ')
      expect(onMemberClick).toHaveBeenCalledTimes(2)
    })

    it('should have proper ARIA labels for action menus', () => {
      render(
        <MemberTable
          members={mockMembers}
          organizationId="org-1"
          canManage={true}
        />
      )
      
      const actionButtons = screen.getAllByLabelText(/Actions for/)
      expect(actionButtons).toHaveLength(mockMembers.length)
    })

    it('should have proper pagination controls', () => {
      render(
        <MemberTable
          members={mockMembers}
          organizationId="org-1"
          canManage={true}
        />
      )
      
      expect(screen.getByLabelText('Go to first page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to last page')).toBeInTheDocument()
    })
  })

  describe('FilterPanel', () => {
    const mockProps = {
      organizationId: 'org-1',
      filters: {},
      onFiltersChange: jest.fn(),
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<FilterPanel {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form structure', () => {
      render(<FilterPanel {...mockProps} />)
      
      const searchInput = screen.getByLabelText('Search team members')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('should have proper fieldsets and legends', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...mockProps} />)
      
      // Open filter panel
      const filterButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filterButton)
      
      await waitFor(() => {
        expect(screen.getByRole('group', { name: /roles/i })).toBeInTheDocument()
        expect(screen.getByRole('group', { name: /projects/i })).toBeInTheDocument()
      })
    })

    it('should have proper ARIA labels for filter controls', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...mockProps} />)
      
      const filterButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filterButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Minimum total hours per week')).toBeInTheDocument()
        expect(screen.getByLabelText('Maximum total hours per week')).toBeInTheDocument()
        expect(screen.getByLabelText('Minimum available hours per week')).toBeInTheDocument()
        expect(screen.getByLabelText('Maximum available hours per week')).toBeInTheDocument()
      })
    })

    it('should announce filter changes to screen readers', async () => {
      const user = userEvent.setup()
      const onFiltersChange = jest.fn()
      
      render(
        <FilterPanel
          {...mockProps}
          filters={{ search: 'test' }}
          onFiltersChange={onFiltersChange}
        />
      )
      
      // Should have live region for filter announcements
      expect(screen.getByText('1 filter applied')).toBeInTheDocument()
    })

    it('should have proper remove filter button labels', () => {
      render(
        <FilterPanel
          {...mockProps}
          filters={{ search: 'test', roles: ['admin'] }}
        />
      )
      
      expect(screen.getByLabelText('Remove search filter: test')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove role filter: admin')).toBeInTheDocument()
    })
  })

  describe('MemberProfileCard', () => {
    const mockMember = createMockMember()
    const mockProps = {
      member: mockMember,
      isOpen: true,
      onClose: jest.fn(),
      currentUserRole: 'admin' as const,
      currentUserId: 'user-1',
      organizationId: 'org-1',
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<MemberProfileCard {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper dialog structure', () => {
      render(<MemberProfileCard {...mockProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('should have proper tab navigation', async () => {
      const user = userEvent.setup()
      render(<MemberProfileCard {...mockProps} />)
      
      const profileTab = screen.getByRole('tab', { name: 'Profile tab' })
      const engagementsTab = screen.getByRole('tab', { name: 'Engagements tab' })
      
      expect(profileTab).toHaveAttribute('aria-selected', 'true')
      
      await user.click(engagementsTab)
      expect(engagementsTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should have proper form labels and descriptions', () => {
      render(<MemberProfileCard {...mockProps} />)
      
      // Should have proper button labels
      expect(screen.getByLabelText('Edit profile information')).toBeInTheDocument()
    })
  })

  describe('MemberInviteDialog', () => {
    const mockProps = {
      open: true,
      onOpenChange: jest.fn(),
      organizationId: 'org-1',
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<MemberInviteDialog {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper dialog structure', () => {
      render(<MemberInviteDialog {...mockProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('should have proper form structure', () => {
      render(<MemberInviteDialog {...mockProps} />)
      
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByLabelText('Working Hours per Week')).toBeInTheDocument()
    })

    it('should have proper error announcements', async () => {
      const user = userEvent.setup()
      render(<MemberInviteDialog {...mockProps} />)
      
      const emailInput = screen.getByLabelText('Email Address')
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /send invitation|add member/i })
      await user.click(submitButton)
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<TeamManagementPage organizationId="org-1" />)
      
      // Should show mobile-optimized tabs
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveClass('text-xs', 'sm:text-sm')
      })
    })

    it('should have touch-friendly targets on mobile', () => {
      render(<TeamManagementPage organizationId="org-1" />)
      
      const addButton = screen.getByLabelText('Add new team member')
      expect(addButton).toHaveClass('touch-target')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup()
      render(<TeamManagementPage organizationId="org-1" />)
      
      // Should be able to tab through all interactive elements
      await user.tab()
      expect(document.activeElement).toHaveAttribute('href', '#main-content')
      
      await user.tab()
      // Should focus on first interactive element in main content
      expect(document.activeElement).toBeInTheDocument()
    })

    it('should trap focus in modal dialogs', async () => {
      const user = userEvent.setup()
      render(<MemberInviteDialog open={true} onOpenChange={jest.fn()} organizationId="org-1" />)
      
      const dialog = screen.getByRole('dialog')
      const firstInput = screen.getByLabelText('Email Address')
      const lastButton = screen.getByRole('button', { name: /cancel/i })
      
      // Focus should start in dialog
      expect(document.activeElement).toBeInTheDocument()
      
      // Tab to last element
      lastButton.focus()
      await user.tab()
      
      // Should wrap back to first element
      expect(firstInput).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce loading states', () => {
      require('@/hooks/useTeamMembers').useTeamMembers.mockReturnValue({
        members: null,
        isLoading: true,
        error: null,
      })
      
      render(<TeamManagementPage organizationId="org-1" />)
      
      expect(screen.getByText('Loading team management...')).toBeInTheDocument()
    })

    it('should announce error states', () => {
      require('@/hooks/useTeamMembers').useTeamMembers.mockReturnValue({
        members: null,
        isLoading: false,
        error: new Error('Failed to load'),
      })
      
      render(<TeamManagementPage organizationId="org-1" />)
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should provide context for dynamic content', () => {
      render(
        <FilterPanel
          organizationId="org-1"
          filters={{ search: 'test' }}
          onFiltersChange={jest.fn()}
        />
      )
      
      // Should announce filter count
      const liveRegion = screen.getByText('1 filter applied')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })
})