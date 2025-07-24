import { test, expect } from '@playwright/test'
import { prisma } from '@/lib/prisma'

test.describe('Team Management - Comprehensive User Acceptance Tests', () => {
  let testOrg: any
  let testUser: any

  test.beforeEach(async ({ page }) => {
    // Setup test data
    testUser = await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    testOrg = await prisma.organization.create({
      data: {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        members: {
          create: {
            userId: testUser.id,
            role: 'owner'
          }
        }
      }
    })

    // Mock authentication
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')
  })

  test.afterEach(async () => {
    // Cleanup
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()
  })

  test('Complete team member management workflow', async ({ page }) => {
    // Navigate to team management
    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Verify page loads correctly
    await expect(page.locator('[data-testid="team-management-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="members-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="guests-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="permission-sets-tab"]')).toBeVisible()

    // Test member invitation flow
    await page.click('[data-testid="invite-member-button"]')
    await expect(page.locator('[data-testid="member-invite-dialog"]')).toBeVisible()
    
    await page.fill('[data-testid="invite-email-input"]', 'newmember@example.com')
    await page.selectOption('[data-testid="invite-role-select"]', 'member')
    await page.click('[data-testid="send-invitation-button"]')
    
    // Verify success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Invitation sent')

    // Verify member appears in table
    await expect(page.locator('[data-testid="member-table"]')).toContainText('newmember@example.com')

    // Test member profile editing
    await page.click('[data-testid="member-row"]:has-text("newmember@example.com")')
    await expect(page.locator('[data-testid="member-profile-card"]')).toBeVisible()
    
    // Edit profile information
    await page.click('[data-testid="profile-tab"]')
    await page.fill('[data-testid="job-title-input"]', 'Senior Developer')
    await page.fill('[data-testid="working-hours-input"]', '35')
    await page.click('[data-testid="save-profile-button"]')
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Profile updated')

    // Test engagement management
    await page.click('[data-testid="engagements-tab"]')
    await page.click('[data-testid="add-engagement-button"]')
    
    await page.selectOption('[data-testid="engagement-project-select"]', 'test-project')
    await page.fill('[data-testid="engagement-hours-input"]', '20')
    await page.fill('[data-testid="engagement-role-input"]', 'Frontend Developer')
    await page.click('[data-testid="save-engagement-button"]')
    
    await expect(page.locator('[data-testid="engagement-list"]')).toContainText('Frontend Developer')
    await expect(page.locator('[data-testid="availability-display"]')).toContainText('15 hours available')

    // Test time-off management
    await page.click('[data-testid="time-off-tab"]')
    await page.click('[data-testid="add-time-off-button"]')
    
    await page.selectOption('[data-testid="time-off-type-select"]', 'vacation')
    await page.fill('[data-testid="time-off-start-date"]', '2024-12-01')
    await page.fill('[data-testid="time-off-end-date"]', '2024-12-05')
    await page.click('[data-testid="save-time-off-button"]')
    
    await expect(page.locator('[data-testid="time-off-list"]')).toContainText('Vacation')
    await expect(page.locator('[data-testid="time-off-list"]')).toContainText('Dec 1 - Dec 5')

    // Close profile card
    await page.click('[data-testid="close-profile-card"]')
  })

  test('Permission sets management workflow', async ({ page }) => {
    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Switch to permission sets tab
    await page.click('[data-testid="permission-sets-tab"]')
    await expect(page.locator('[data-testid="permission-sets-manager"]')).toBeVisible()

    // Create custom permission set
    await page.click('[data-testid="create-permission-set-button"]')
    await page.fill('[data-testid="permission-set-name-input"]', 'Project Manager')
    
    // Configure permissions
    await page.check('[data-testid="team-members-view-all"]')
    await page.check('[data-testid="projects-view-all"]')
    await page.check('[data-testid="projects-manage-assigned"]')
    
    await page.click('[data-testid="save-permission-set-button"]')
    
    // Verify permission set was created
    await expect(page.locator('[data-testid="permission-set-list"]')).toContainText('Project Manager')

    // Test permission set assignment
    await page.click('[data-testid="members-tab"]')
    await page.click('[data-testid="member-row"]:first-child')
    await page.selectOption('[data-testid="permission-set-select"]', 'Project Manager')
    await page.click('[data-testid="save-profile-button"]')
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Permissions updated')
  })

  test('Advanced filtering and search functionality', async ({ page }) => {
    // Create additional test members
    await prisma.organizationMember.createMany({
      data: [
        {
          organizationId: testOrg.id,
          userId: 'user-2',
          role: 'member',
          jobTitle: 'Designer',
          workingHoursPerWeek: 40
        },
        {
          organizationId: testOrg.id,
          userId: 'user-3',
          role: 'admin',
          jobTitle: 'Manager',
          workingHoursPerWeek: 35
        }
      ]
    })

    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Test search functionality
    await page.fill('[data-testid="member-search-input"]', 'Designer')
    await expect(page.locator('[data-testid="member-table"] tbody tr')).toHaveCount(1)
    await expect(page.locator('[data-testid="member-table"]')).toContainText('Designer')

    // Clear search
    await page.fill('[data-testid="member-search-input"]', '')
    await expect(page.locator('[data-testid="member-table"] tbody tr')).toHaveCount(3)

    // Test role filtering
    await page.click('[data-testid="filter-panel-toggle"]')
    await page.check('[data-testid="role-filter-admin"]')
    await expect(page.locator('[data-testid="member-table"] tbody tr')).toHaveCount(1)
    await expect(page.locator('[data-testid="member-table"]')).toContainText('Manager')

    // Test hours filtering
    await page.uncheck('[data-testid="role-filter-admin"]')
    await page.fill('[data-testid="hours-filter-min"]', '35')
    await page.fill('[data-testid="hours-filter-max"]', '40')
    await expect(page.locator('[data-testid="member-table"] tbody tr')).toHaveCount(3)

    // Test saved filters
    await page.click('[data-testid="save-filter-button"]')
    await page.fill('[data-testid="filter-name-input"]', 'Full-time Members')
    await page.click('[data-testid="confirm-save-filter"]')
    
    await expect(page.locator('[data-testid="saved-filters"]')).toContainText('Full-time Members')
  })

  test('Member removal and leave functionality', async ({ page }) => {
    // Create test member
    const testMember = await prisma.organizationMember.create({
      data: {
        organizationId: testOrg.id,
        userId: 'removable-user',
        role: 'member',
        workingHoursPerWeek: 40
      }
    })

    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Test member removal by admin
    await page.click(`[data-testid="member-actions-${testMember.id}"]`)
    await page.click('[data-testid="remove-member-action"]')
    
    await expect(page.locator('[data-testid="member-removal-dialog"]')).toBeVisible()
    await page.check('[data-testid="confirm-removal-checkbox"]')
    await page.click('[data-testid="confirm-removal-button"]')
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Member removed')
    await expect(page.locator('[data-testid="member-table"]')).not.toContainText('removable-user')

    // Test voluntary leave (simulate as member)
    // This would require switching user context in a real test
    await page.click('[data-testid="leave-organization-button"]')
    await expect(page.locator('[data-testid="leave-confirmation-dialog"]')).toBeVisible()
    await page.fill('[data-testid="leave-confirmation-input"]', 'LEAVE')
    await page.click('[data-testid="confirm-leave-button"]')
    
    // Should redirect to organizations page
    await expect(page).toHaveURL('/organizations')
  })

  test('Responsive design and mobile functionality', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-member-cards"]')).toBeVisible()
    await expect(page.locator('[data-testid="desktop-member-table"]')).not.toBeVisible()

    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-toggle"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    
    await page.click('[data-testid="permission-sets-tab-mobile"]')
    await expect(page.locator('[data-testid="permission-sets-manager"]')).toBeVisible()

    // Test mobile member profile
    await page.click('[data-testid="members-tab-mobile"]')
    await page.click('[data-testid="mobile-member-card"]:first-child')
    
    await expect(page.locator('[data-testid="mobile-member-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-profile-tabs"]')).toBeVisible()

    // Test swipe gestures (if supported)
    await page.locator('[data-testid="mobile-profile-tabs"]').swipe({ dx: -100, dy: 0 })
    await expect(page.locator('[data-testid="engagements-tab-content"]')).toBeVisible()
  })

  test('Accessibility compliance', async ({ page }) => {
    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="invite-member-button"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="member-search-input"]')).toBeFocused()

    // Test ARIA labels and roles
    const inviteButton = page.locator('[data-testid="invite-member-button"]')
    await expect(inviteButton).toHaveAttribute('aria-label', 'Invite new team member')
    
    const memberTable = page.locator('[data-testid="member-table"]')
    await expect(memberTable).toHaveAttribute('role', 'table')

    // Test screen reader announcements
    await page.click('[data-testid="invite-member-button"]')
    const dialog = page.locator('[data-testid="member-invite-dialog"]')
    await expect(dialog).toHaveAttribute('role', 'dialog')
    await expect(dialog).toHaveAttribute('aria-labelledby')

    // Test color contrast (would require additional tools in real implementation)
    // This is a placeholder for actual color contrast testing
    const primaryButton = page.locator('[data-testid="send-invitation-button"]')
    await expect(primaryButton).toHaveCSS('background-color', 'rgb(59, 130, 246)') // Blue-600
  })

  test('Error handling and recovery', async ({ page }) => {
    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Test network error handling
    await page.route('**/api/organizations/*/members', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })

    await page.reload()
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load team members')
    
    // Test retry functionality
    await page.unroute('**/api/organizations/*/members')
    await page.click('[data-testid="retry-button"]')
    await expect(page.locator('[data-testid="member-table"]')).toBeVisible()

    // Test validation errors
    await page.click('[data-testid="invite-member-button"]')
    await page.fill('[data-testid="invite-email-input"]', 'invalid-email')
    await page.click('[data-testid="send-invitation-button"]')
    
    await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-validation-error"]')).toContainText('Please enter a valid email address')

    // Test permission errors
    await page.route('**/api/organizations/*/members', route => {
      route.fulfill({ status: 403, body: 'Insufficient permissions' })
    })

    await page.fill('[data-testid="invite-email-input"]', 'valid@example.com')
    await page.click('[data-testid="send-invitation-button"]')
    
    await expect(page.locator('[data-testid="permission-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="permission-error"]')).toContainText('You do not have permission to invite members')
  })

  test('Performance and loading states', async ({ page }) => {
    // Test loading states
    await page.route('**/api/organizations/*/members', route => {
      setTimeout(() => route.continue(), 2000) // Simulate slow response
    })

    await page.goto(`/organizations/${testOrg.id}/members`)
    
    // Verify loading skeleton is shown
    await expect(page.locator('[data-testid="member-table-skeleton"]')).toBeVisible()
    
    // Wait for data to load
    await expect(page.locator('[data-testid="member-table"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="member-table-skeleton"]')).not.toBeVisible()

    // Test optimistic updates
    await page.click('[data-testid="invite-member-button"]')
    await page.fill('[data-testid="invite-email-input"]', 'optimistic@example.com')
    await page.click('[data-testid="send-invitation-button"]')
    
    // Should show optimistic update immediately
    await expect(page.locator('[data-testid="member-table"]')).toContainText('optimistic@example.com')
    
    // Test pagination performance with large datasets
    // This would require seeding a large dataset in beforeEach
    await page.click('[data-testid="pagination-next"]')
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="member-table"]')).toBeVisible()
  })
})