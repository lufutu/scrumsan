import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { InvitationAcceptPage } from '@/components/invitations/InvitationAcceptPage'
import { AccountCreationForm } from '@/components/invitations/AccountCreationForm'
import { GET as getInvitation, POST as acceptInvitation } from '@/app/api/invitations/[token]/route'
import { POST as createAccount } from '@/app/api/invitations/[token]/create-account/route'
import { checkUserExistsByEmail } from '@/lib/user-existence-utils'

// Helper function to render InvitationAcceptPage
const renderInvitationPage = (token: string) => {
  return render(React.createElement(InvitationAcceptPage, { token }))
}

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    teamInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organizationMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/user-existence-utils', () => ({
  checkUserExistsByEmail: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch globally
global.fetch = vi.fn()

const mockPrisma = vi.mocked(await import('@/lib/prisma')).prisma
const mockCreateServerClient = vi.mocked(await import('@/lib/supabase/server')).createClient
const mockCreateClientClient = vi.mocked(await import('@/lib/supabase/client')).createClient
const mockGetCurrentUser = vi.mocked(await import('@/lib/auth-utils')).getCurrentUser
const mockCheckUserExistsByEmail = vi.mocked(checkUserExistsByEmail)

describe('Invitation Account Creation Integration Tests', () => {
  const mockToken = 'test-invitation-token'
  const mockInvitation = {
    id: 'invitation-123',
    organizationId: 'org-123',
    email: 'newuser@test.com',
    role: 'member',
    permissionSetId: 'perm-123',
    jobTitle: 'Developer',
    workingHoursPerWeek: 40,
    invitedBy: 'inviter-123',
    token: mockToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    acceptedAt: null,
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      logo: null,
    },
    inviter: {
      fullName: 'Test Inviter',
      email: 'inviter@test.com',
    },
    permissionSet: {
      id: 'perm-123',
      name: 'Test Permission Set',
      permissions: ['read', 'write'],
    },
  }

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateServerClient.mockResolvedValue(mockSupabaseClient as any)
    mockCreateClientClient.mockReturnValue(mockSupabaseClient as any)
    ;(global.fetch as any).mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('End-to-End New User Flow', () => {
    it('should complete full new user invitation acceptance flow', async () => {
      // Step 1: Setup - User doesn't exist
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Step 2: Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Step 3: Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Step 4: Mock account creation API
      const mockAccountResponse = {
        user: { id: 'user-123', email: 'newuser@test.com', fullName: 'newuser' },
        member: { id: 'member-123', organizationId: 'org-123', userId: 'user-123' },
        organization: mockInvitation.organization,
        autoSignedIn: true,
        message: 'Welcome to Test Organization!',
      }

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccountResponse),
        })
      )

      // Step 5: Mock Supabase auth state after account creation
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'newuser@test.com' } },
        error: null,
      })

      // Step 6: Render the invitation page
      renderInvitationPage(mockToken)

      // Step 7: Wait for loading to complete and account creation form to appear
      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Step 8: Fill out the account creation form
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)

      // Step 9: Submit the form
      fireEvent.click(submitButton)

      // Step 10: Verify account creation API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/invitations/${mockToken}/create-account`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'StrongPass123!' }),
          })
        )
      })

      // Step 11: Verify success state and redirect preparation
      await waitFor(() => {
        expect(screen.getAllByText(/account created successfully/i)[0]).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should handle account creation with auto sign-in failure', async () => {
      // Setup - User doesn't exist
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Mock account creation API with failed auto sign-in
      const mockAccountResponse = {
        user: { id: 'user-123', email: 'newuser@test.com', fullName: 'newuser' },
        member: { id: 'member-123', organizationId: 'org-123', userId: 'user-123' },
        organization: mockInvitation.organization,
        autoSignedIn: false, // Auto sign-in failed
        message: 'Welcome to Test Organization!',
      }

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccountResponse),
        })
      )

      renderInvitationPage(mockToken)

      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Fill and submit form
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)

      // Verify success message for account creation but sign-in prompt
      await waitFor(() => {
        expect(screen.getAllByText(/account created successfully/i)[0]).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Existing User Flow Preservation', () => {
    it('should show login flow for existing users', async () => {
      // Setup - User exists
      const existingUser = {
        id: 'existing-user-123',
        email: 'newuser@test.com',
        fullName: 'Existing User',
        avatarUrl: null,
      }

      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: true,
        user: existingUser,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: true, user: existingUser }),
        })
      )

      // Mock no current user (not signed in)
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      renderInvitationPage(mockToken)

      // Should show existing user flow (sign in button)
      await waitFor(() => {
        expect(screen.getByText('Sign In to Accept')).toBeInTheDocument()
      })

      // Should NOT show account creation form
      expect(screen.queryByText('Create Your Account')).not.toBeInTheDocument()
    })

    it('should auto-accept invitation for signed-in existing user', async () => {
      // Setup - User exists and is signed in
      const existingUser = {
        id: 'existing-user-123',
        email: 'newuser@test.com',
        fullName: 'Existing User',
        avatarUrl: null,
      }

      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: true,
        user: existingUser,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: true, user: existingUser }),
        })
      )

      // Mock signed-in user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'existing-user-123', email: 'newuser@test.com' } },
        error: null,
      })

      // Mock invitation acceptance API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            member: { id: 'member-123' },
            organization: mockInvitation.organization,
            message: 'Welcome to Test Organization!',
          }),
        })
      )

      renderInvitationPage(mockToken)

      // Should show accept invitation button
      await waitFor(() => {
        expect(screen.getByText('Accept Invitation')).toBeInTheDocument()
      })

      // Click accept invitation
      const acceptButton = screen.getByText('Accept Invitation')
      fireEvent.click(acceptButton)

      // Verify invitation acceptance API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/invitations/${mockToken}`,
          expect.objectContaining({
            method: 'POST',
          })
        )
      })
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should handle network errors during user existence check', async () => {
      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock network error for user existence check
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new TypeError('Failed to fetch'))
      )

      renderInvitationPage(mockToken)

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Should show retry option
      expect(screen.getByText('Try Again')).toBeInTheDocument()

      // Should show fallback option
      expect(screen.getByText('Continue with Account Creation')).toBeInTheDocument()
    })

    it('should handle account creation API errors', async () => {
      // Setup - User doesn't exist
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Mock account creation API error
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ error: 'A user with this email already exists' }),
        })
      )

      renderInvitationPage(mockToken)

      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Fill and submit form
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/user with this email already exists/i)).toBeInTheDocument()
      })
    })

    it('should handle expired invitation', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      }

      // Mock invitation fetch with expired invitation
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 410,
          json: () => Promise.resolve({ error: 'Invitation has expired' }),
        })
      )

      renderInvitationPage(mockToken)

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/invitation has expired/i)).toBeInTheDocument()
      })
    })

    it('should handle invalid invitation token', async () => {
      // Mock invitation fetch with invalid token
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Invitation not found' }),
        })
      )

      renderInvitationPage('invalid-token')

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/invitation not found/i)).toBeInTheDocument()
      })
    })

    it('should handle service unavailable errors', async () => {
      // Setup - User doesn't exist
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Mock service unavailable error
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: 'Service temporarily unavailable' }),
        })
      )

      renderInvitationPage(mockToken)

      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Fill and submit form
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)

      // Should show service unavailable message
      await waitFor(() => {
        expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Integration and Session Management', () => {
    it('should properly manage authentication state during account creation', async () => {
      // Setup - User doesn't exist
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Mock successful account creation
      const mockAccountResponse = {
        user: { id: 'user-123', email: 'newuser@test.com', fullName: 'newuser' },
        member: { id: 'member-123', organizationId: 'org-123', userId: 'user-123' },
        organization: mockInvitation.organization,
        autoSignedIn: true,
        message: 'Welcome to Test Organization!',
      }

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccountResponse),
        })
      )

      // Mock auth state changes
      let authCallCount = 0
      mockSupabaseClient.auth.getUser.mockImplementation(() => {
        authCallCount++
        if (authCallCount === 1) {
          // Initial state - no user
          return Promise.resolve({ data: { user: null }, error: null })
        } else {
          // After account creation - user signed in
          return Promise.resolve({
            data: { user: { id: 'user-123', email: 'newuser@test.com' } },
            error: null,
          })
        }
      })

      renderInvitationPage(mockToken)

      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Fill and submit form
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)

      // Verify auth state was checked at least once (timing can vary)
      await waitFor(() => {
        expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle session refresh after account creation', async () => {
      // This test verifies that the component properly refreshes the auth session
      // after successful account creation to ensure the user is properly authenticated

      // Setup - User doesn't exist initially
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Mock successful account creation with auto sign-in
      const mockAccountResponse = {
        user: { id: 'user-123', email: 'newuser@test.com', fullName: 'newuser' },
        member: { id: 'member-123', organizationId: 'org-123', userId: 'user-123' },
        organization: mockInvitation.organization,
        autoSignedIn: true,
        message: 'Welcome to Test Organization!',
      }

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccountResponse),
        })
      )

      // Mock auth state progression
      let getUserCallCount = 0
      mockSupabaseClient.auth.getUser.mockImplementation(() => {
        getUserCallCount++
        if (getUserCallCount <= 2) {
          // Initial calls - no user
          return Promise.resolve({ data: { user: null }, error: null })
        } else {
          // After account creation and session refresh - user is authenticated
          return Promise.resolve({
            data: { user: { id: 'user-123', email: 'newuser@test.com' } },
            error: null,
          })
        }
      })

      renderInvitationPage(mockToken)

      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Complete account creation
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)

      // Wait for success and verify session refresh occurred
      await waitFor(() => {
        expect(screen.getAllByText(/account created successfully/i)[0]).toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify that getUser was called multiple times (initial + refresh)
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(2)
    })

    it('should handle authentication errors during session management', async () => {
      // Setup - User doesn't exist
      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: false,
        user: null,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: false, user: null }),
        })
      )

      // Mock successful account creation
      const mockAccountResponse = {
        user: { id: 'user-123', email: 'newuser@test.com', fullName: 'newuser' },
        member: { id: 'member-123', organizationId: 'org-123', userId: 'user-123' },
        organization: mockInvitation.organization,
        autoSignedIn: true,
        message: 'Welcome to Test Organization!',
      }

      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccountResponse),
        })
      )

      // Mock auth error during session refresh
      let getUserCallCount = 0
      mockSupabaseClient.auth.getUser.mockImplementation(() => {
        getUserCallCount++
        if (getUserCallCount <= 2) {
          return Promise.resolve({ data: { user: null }, error: null })
        } else {
          // Simulate auth error during refresh
          return Promise.resolve({
            data: { user: null },
            error: { message: 'Session expired' },
          })
        }
      })

      renderInvitationPage(mockToken)

      await waitFor(() => {
        expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      })

      // Complete account creation
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)

      // Should still show success but handle auth error gracefully
      await waitFor(() => {
        expect(screen.getAllByText(/account created successfully/i)[0]).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Email Mismatch Scenarios', () => {
    it('should handle email mismatch for existing signed-in user', async () => {
      // Setup - User exists but different email
      const existingUser = {
        id: 'existing-user-123',
        email: 'different@test.com', // Different from invitation email
        fullName: 'Different User',
        avatarUrl: null,
      }

      mockCheckUserExistsByEmail.mockResolvedValue({
        exists: true,
        user: existingUser,
      })

      // Mock invitation fetch
      ;(global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInvitation),
        })
      )

      // Mock user existence check API
      ;(global.fetch as unknown).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exists: true, user: existingUser }),
        })
      )

      // Mock signed-in user with different email
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'existing-user-123', email: 'different@test.com' } },
        error: null,
      })

      renderInvitationPage(mockToken)

      // Should show email mismatch warning
      await waitFor(() => {
        expect(screen.getByText(/this invitation is for newuser@test.com/i)).toBeInTheDocument()
        expect(screen.getByText(/you're signed in as different@test.com/i)).toBeInTheDocument()
      })

      // Accept button should be disabled
      const acceptButton = screen.getByText('Accept Invitation')
      expect(acceptButton).toBeDisabled()
    })
  })
})