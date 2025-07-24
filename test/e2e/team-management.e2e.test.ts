import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { chromium, Browser, Page, BrowserContext } from 'playwright'

describe('Team Management E2E Tests', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  const baseURL = process.env.BASE_URL || 'http://localhost:3000'
  const testUser = {
    email: 'admin@example.com',
    password: 'testpassword123',
  }

  beforeEach(async () => {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    page = await context.newPage()
    
    // Login before each test
    await page.goto(`${baseURL}/login`)
    await page.fill('[data-testid="email-input"]', testUser.email)
    await page.fill('[data-testid="password-input"]', testUser.password)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('**/organizations')
    
    // Navigate to team management
    await page.click('[data-testid="organization-card"]')
    await page.click('[data-testid="team-management-nav"]')
    await page.waitForURL('**/organizations/*/members')
  })

  afterEach(async () => {
    await context.close()
    await browser.close()
  })

  describe('Member Management Workflow', () => {
    it('should complete full member lifecycle', async () => {
      // 1. Add new member
      await page.click('[data-testid="add-member-button"]')
      await page.waitForSelector('[data-testid="member-invite-dialog"]')
      
      await page.fill('[data-testid="member-email-input"]', 'newmember@example.com')
      await page.selectOption('[data-testid="member-role-select"]', 'member')
      await page.fill('[data-testid="member-job-title-input"]', 'Junior Developer')
      await page.fill('[data-testid="member-hours-input"]', '35')
      
      await page.click('[data-testid="invite-member-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify member appears in table
      await expect(page.locator('text=newmember@example.com')).toBeVisible()
      await expect(page.locator('text=Junior Developer')).toBeVisible()
      
      // 2. Edit member profile
      await page.click('[data-testid="member-row"]:has-text("newmember@example.com")')
      await page.waitForSelector('[data-testid="member-profile-dialog"]')
      
      await page.click('[data-testid="profile-tab"]')
      await page.fill('[data-testid="job-title-input"]', 'Developer')
      await page.fill('[data-testid="working-hours-input"]', '40')
      
      await page.click('[data-testid="save-profile-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify changes
      await page.click('[data-testid="close-dialog-button"]')
      await expect(page.locator('text=Developer')).toBeVisible()
      await expect(page.locator('text=40h/week')).toBeVisible()
      
      // 3. Add engagement
      await page.click('[data-testid="member-row"]:has-text("newmember@example.com")')
      await page.click('[data-testid="engagements-tab"]')
      await page.click('[data-testid="add-engagement-button"]')
      
      await page.selectOption('[data-testid="project-select"]', 'project-1')
      await page.fill('[data-testid="engagement-role-input"]', 'Frontend Developer')
      await page.fill('[data-testid="engagement-hours-input"]', '25')
      await page.fill('[data-testid="start-date-input"]', '2024-03-01')
      
      await page.click('[data-testid="save-engagement-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify engagement appears
      await expect(page.locator('text=Frontend Developer')).toBeVisible()
      await expect(page.locator('text=25h/week')).toBeVisible()
      
      // 4. Add time-off
      await page.click('[data-testid="time-off-tab"]')
      await page.click('[data-testid="add-time-off-button"]')
      
      await page.selectOption('[data-testid="time-off-type-select"]', 'vacation')
      await page.fill('[data-testid="time-off-start-date"]', '2024-07-01')
      await page.fill('[data-testid="time-off-end-date"]', '2024-07-10')
      await page.fill('[data-testid="time-off-description"]', 'Summer vacation')
      
      await page.click('[data-testid="save-time-off-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify time-off appears
      await expect(page.locator('text=Summer vacation')).toBeVisible()
      await expect(page.locator('text=Jul 1 - Jul 10, 2024')).toBeVisible()
      
      // 5. Remove member
      await page.click('[data-testid="close-dialog-button"]')
      await page.click('[data-testid="member-actions-menu"]:has-text("newmember@example.com")')
      await page.click('[data-testid="remove-member-action"]')
      
      await page.waitForSelector('[data-testid="member-removal-dialog"]')
      await page.click('[data-testid="confirm-removal-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify member is removed
      await expect(page.locator('text=newmember@example.com')).not.toBeVisible()
    })

    it('should handle member invitation flow', async () => {
      await page.click('[data-testid="add-member-button"]')
      
      // Test email invitation for non-existing user
      await page.fill('[data-testid="member-email-input"]', 'invited@example.com')
      await page.selectOption('[data-testid="member-role-select"]', 'member')
      
      await page.click('[data-testid="invite-member-button"]')
      await page.waitForSelector('[data-testid="invitation-sent-message"]')
      
      // Verify invitation status
      await expect(page.locator('text=Invitation sent to invited@example.com')).toBeVisible()
    })

    it('should validate member form inputs', async () => {
      await page.click('[data-testid="add-member-button"]')
      
      // Try to submit without email
      await page.click('[data-testid="invite-member-button"]')
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      
      // Try invalid email format
      await page.fill('[data-testid="member-email-input"]', 'invalid-email')
      await page.click('[data-testid="invite-member-button"]')
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
      
      // Try invalid working hours
      await page.fill('[data-testid="member-email-input"]', 'valid@example.com')
      await page.fill('[data-testid="member-hours-input"]', '200')
      await page.click('[data-testid="invite-member-button"]')
      await expect(page.locator('[data-testid="hours-error"]')).toBeVisible()
    })
  })

  describe('Permission Sets Management Workflow', () => {
    it('should create and manage permission sets', async () => {
      // Navigate to permission sets tab
      await page.click('[data-testid="permission-sets-tab"]')
      
      // 1. Create new permission set
      await page.click('[data-testid="create-permission-set-button"]')
      await page.waitForSelector('[data-testid="permission-set-dialog"]')
      
      await page.fill('[data-testid="permission-set-name"]', 'Project Manager')
      
      // Configure permissions
      await page.check('[data-testid="team-members-view-all"]')
      await page.check('[data-testid="projects-view-all"]')
      await page.check('[data-testid="projects-manage-all"]')
      await page.check('[data-testid="invoicing-view-assigned"]')
      
      await page.click('[data-testid="save-permission-set-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify permission set appears
      await expect(page.locator('text=Project Manager')).toBeVisible()
      
      // 2. Edit permission set
      await page.click('[data-testid="permission-set-actions"]:has-text("Project Manager")')
      await page.click('[data-testid="edit-permission-set-action"]')
      
      await page.check('[data-testid="team-members-manage-all"]')
      await page.click('[data-testid="save-permission-set-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // 3. Assign permission set to member
      await page.click('[data-testid="members-tab"]')
      await page.click('[data-testid="member-row"]')
      await page.click('[data-testid="profile-tab"]')
      
      await page.selectOption('[data-testid="permission-set-select"]', 'Project Manager')
      await page.click('[data-testid="save-profile-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify assignment
      await page.click('[data-testid="close-dialog-button"]')
      await expect(page.locator('text=Project Manager')).toBeVisible()
      
      // 4. Delete permission set (should prompt for reassignment)
      await page.click('[data-testid="permission-sets-tab"]')
      await page.click('[data-testid="permission-set-actions"]:has-text("Project Manager")')
      await page.click('[data-testid="delete-permission-set-action"]')
      
      await page.waitForSelector('[data-testid="reassignment-dialog"]')
      await page.selectOption('[data-testid="reassignment-select"]', 'Member')
      await page.click('[data-testid="confirm-deletion-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Verify deletion
      await expect(page.locator('text=Project Manager')).not.toBeVisible()
    })

    it('should validate permission dependencies', async () => {
      await page.click('[data-testid="permission-sets-tab"]')
      await page.click('[data-testid="create-permission-set-button"]')
      
      await page.fill('[data-testid="permission-set-name"]', 'Invalid Set')
      
      // Try to enable manage without view
      await page.check('[data-testid="team-members-manage-all"]')
      // Don't check view-all
      
      await page.click('[data-testid="save-permission-set-button"]')
      await expect(page.locator('[data-testid="dependency-error"]')).toBeVisible()
      
      // Fix the dependency
      await page.check('[data-testid="team-members-view-all"]')
      await page.click('[data-testid="save-permission-set-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
    })
  })

  describe('Filtering and Search Workflow', () => {
    it('should filter members by various criteria', async () => {
      // Test role filter
      await page.click('[data-testid="filter-button"]')
      await page.selectOption('[data-testid="role-filter"]', 'admin')
      await page.click('[data-testid="apply-filters-button"]')
      
      // Verify only admin members are shown
      const adminMembers = await page.locator('[data-testid="member-row"]').count()
      expect(adminMembers).toBeGreaterThan(0)
      
      // Test search
      await page.fill('[data-testid="search-input"]', 'john')
      await page.waitForTimeout(500) // Debounce
      
      // Verify search results
      await expect(page.locator('text=John')).toBeVisible()
      
      // Test hours filter
      await page.click('[data-testid="filter-button"]')
      await page.fill('[data-testid="min-hours-filter"]', '35')
      await page.fill('[data-testid="max-hours-filter"]', '40')
      await page.click('[data-testid="apply-filters-button"]')
      
      // Verify filtered results
      const filteredMembers = await page.locator('[data-testid="member-row"]').count()
      expect(filteredMembers).toBeGreaterThan(0)
      
      // Clear filters
      await page.click('[data-testid="clear-filters-button"]')
      
      // Verify all members are shown again
      const allMembers = await page.locator('[data-testid="member-row"]').count()
      expect(allMembers).toBeGreaterThan(filteredMembers)
    })

    it('should save and load filter presets', async () => {
      // Apply filters
      await page.click('[data-testid="filter-button"]')
      await page.selectOption('[data-testid="role-filter"]', 'member')
      await page.fill('[data-testid="min-hours-filter"]', '30')
      await page.click('[data-testid="apply-filters-button"]')
      
      // Save filter preset
      await page.click('[data-testid="save-filter-preset-button"]')
      await page.fill('[data-testid="preset-name-input"]', 'Active Members')
      await page.click('[data-testid="save-preset-button"]')
      await page.waitForSelector('[data-testid="success-toast"]')
      
      // Clear filters
      await page.click('[data-testid="clear-filters-button"]')
      
      // Load saved preset
      await page.click('[data-testid="filter-presets-dropdown"]')
      await page.click('[data-testid="preset-option"]:has-text("Active Members")')
      
      // Verify filters are applied
      await expect(page.locator('[data-testid="role-filter"]')).toHaveValue('member')
      await expect(page.locator('[data-testid="min-hours-filter"]')).toHaveValue('30')
    })
  })

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support keyboard navigation', async () => {
      // Tab through main navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Navigate tabs with arrow keys
      await page.keyboard.press('ArrowRight')
      await expect(page.locator('[data-testid="guests-tab"]')).toBeFocused()
      
      await page.keyboard.press('ArrowRight')
      await expect(page.locator('[data-testid="permission-sets-tab"]')).toBeFocused()
      
      // Navigate back to members
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')
      await expect(page.locator('[data-testid="members-tab"]')).toBeFocused()
      
      // Enter to activate tab
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-testid="members-tab"]')).toHaveAttribute('aria-selected', 'true')
    })

    it('should have proper ARIA labels and roles', async () => {
      // Check main navigation
      const tabList = page.locator('[role="tablist"]')
      await expect(tabList).toHaveAttribute('aria-label', 'Team management sections')
      
      // Check table accessibility
      const table = page.locator('[role="table"]')
      await expect(table).toHaveAttribute('aria-label', 'Team members')
      
      // Check column headers
      const columnHeaders = page.locator('[role="columnheader"]')
      const headerCount = await columnHeaders.count()
      expect(headerCount).toBeGreaterThan(0)
      
      // Check buttons have labels
      const addButton = page.locator('[data-testid="add-member-button"]')
      await expect(addButton).toHaveAttribute('aria-label')
    })

    it('should work with screen reader announcements', async () => {
      // This would require additional screen reader testing tools
      // For now, we'll check that live regions are properly set up
      
      await page.click('[data-testid="add-member-button"]')
      await page.fill('[data-testid="member-email-input"]', 'test@example.com')
      await page.click('[data-testid="invite-member-button"]')
      
      // Check for live region announcements
      const liveRegion = page.locator('[aria-live="polite"]')
      await expect(liveRegion).toBeVisible()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/organizations/*/members', route => {
        route.abort('failed')
      })
      
      await page.reload()
      
      // Check error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
      
      // Test retry functionality
      await page.unroute('**/api/organizations/*/members')
      await page.click('[data-testid="retry-button"]')
      
      // Should recover and show data
      await expect(page.locator('[data-testid="member-row"]')).toBeVisible()
    })

    it('should handle validation errors from server', async () => {
      await page.click('[data-testid="add-member-button"]')
      
      // Mock server validation error
      await page.route('**/api/organizations/*/members', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Email already exists in organization',
            field: 'email'
          })
        })
      })
      
      await page.fill('[data-testid="member-email-input"]', 'existing@example.com')
      await page.click('[data-testid="invite-member-button"]')
      
      // Check error display
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible()
      await expect(page.locator('text=Email already exists')).toBeVisible()
    })

    it('should handle permission denied scenarios', async () => {
      // Mock permission denied response
      await page.route('**/api/organizations/*/members', route => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Insufficient permissions'
          })
        })
      })
      
      await page.reload()
      
      // Check permission denied state
      await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible()
      await expect(page.locator('text=You don\'t have permission')).toBeVisible()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Check mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      
      // Test mobile table view
      await expect(page.locator('[data-testid="mobile-member-card"]')).toBeVisible()
      
      // Test mobile dialogs
      await page.click('[data-testid="add-member-button"]')
      await expect(page.locator('[data-testid="member-invite-dialog"]')).toBeVisible()
      
      // Check dialog is properly sized for mobile
      const dialog = page.locator('[data-testid="member-invite-dialog"]')
      const boundingBox = await dialog.boundingBox()
      expect(boundingBox?.width).toBeLessThan(375)
    })
  })
})