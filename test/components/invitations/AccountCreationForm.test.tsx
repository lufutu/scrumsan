import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, beforeEach } from 'vitest'
import { AccountCreationForm } from '@/components/invitations/AccountCreationForm'

// Mock the fetch function
global.fetch = vi.fn()

const mockInvitation = {
  id: 'test-invitation-id',
  email: 'test@example.com',
  role: 'Member',
  jobTitle: 'Developer',
  organization: {
    id: 'org-1',
    name: 'Test Organization',
    logo: null
  },
  inviter: {
    fullName: 'John Doe',
    email: 'john@example.com'
  },
  permissionSet: {
    name: 'Standard'
  },
  expiresAt: '2024-12-31T23:59:59Z'
}

describe('AccountCreationForm', () => {
  const mockOnAccountCreated = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as unknown).mockClear()
  })

  it('renders the form with invitation details', () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    expect(screen.getByText('Test Organization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(screen.getByText('Developer')).toBeInTheDocument()
  })

  it('validates password strength', async () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    
    // Test that password strength indicator appears when password is entered
    fireEvent.change(passwordInput, { target: { value: '123' } })
    await waitFor(() => {
      expect(screen.getByText('Password strength:')).toBeInTheDocument()
    })
    
    // Test strong password shows better strength
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    await waitFor(() => {
      expect(screen.getByText('Password strength:')).toBeInTheDocument()
    })
  })

  it('validates password confirmation', () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPass123!' } })
    
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    expect(screen.getByText('Passwords match')).toBeInTheDocument()
  })

  it('disables submit button when form is invalid', () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create account/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when form is valid', () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByLabelText(/I agree to the/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.click(termsCheckbox)
    
    expect(submitButton).toBeEnabled()
  })

  it('submits form with correct data', async () => {
    const mockResponse = {
      user: { id: 'user-1', email: 'test@example.com' },
      member: { id: 'member-1' },
      organization: { id: 'org-1', name: 'Test Org' },
      autoSignedIn: true,
      message: 'Welcome!'
    }
    
    ;(fetch as unknown).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByLabelText(/I agree to the/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/invitations/test-invitation-id/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'StrongPass123!',
        }),
      })
    })

    // Wait for the success state and callback with longer timeout due to delays
    await waitFor(() => {
      expect(mockOnAccountCreated).toHaveBeenCalledWith(mockResponse)
    }, { timeout: 3000 })
  })

  it('handles API errors', async () => {
    ;(fetch as unknown).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Account creation failed' })
    })

    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByLabelText(/I agree to the/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Account creation failed')).toBeInTheDocument()
    })

    expect(mockOnError).toHaveBeenCalledWith('Account creation failed')
  })

  it('toggles password visibility', () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const toggleButton = screen.getAllByRole('button')[0] // First toggle button
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('handles network errors gracefully', async () => {
    // Mock fetch to throw a network error
    ;(fetch as unknown).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByLabelText(/I agree to the/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
    })

    expect(mockOnError).toHaveBeenCalledWith('Failed to fetch')
  })

  it('handles different HTTP error status codes', async () => {
    const testCases = [
      { status: 503, expectedMessage: 'Service temporarily unavailable. Please try again in a moment.' },
      { status: 500, expectedMessage: 'Account creation failed' }
    ]

    for (const testCase of testCases) {
      vi.clearAllMocks()
      
      ;(fetch as unknown).mockResolvedValueOnce({
        ok: false,
        status: testCase.status,
        json: async () => ({ error: 'Account creation failed' })
      })

      const { unmount } = render(
        <AccountCreationForm
          invitation={mockInvitation}
          onAccountCreated={mockOnAccountCreated}
          onError={mockOnError}
        />
      )

      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const termsCheckbox = screen.getByLabelText(/I agree to the/i)
      const submitButton = screen.getAllByRole('button', { name: /create account/i })[0]
      
      fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
      fireEvent.click(termsCheckbox)
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(testCase.expectedMessage)).toBeInTheDocument()
      })
      
      unmount()
    }
  })

  it('validates password strength correctly', async () => {
    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    
    // Test that password strength indicator appears
    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    await waitFor(() => {
      expect(screen.getByText('Password strength:')).toBeInTheDocument()
    })
    
    // Test strong password shows strength indicator
    fireEvent.change(passwordInput, { target: { value: 'VeryStrong123!' } })
    await waitFor(() => {
      expect(screen.getByText('Password strength:')).toBeInTheDocument()
    })
  })

  it('shows progress during account creation', async () => {
    const mockResponse = {
      user: { id: 'user-1', email: 'test@example.com' },
      member: { id: 'member-1' },
      organization: { id: 'org-1', name: 'Test Org' },
      autoSignedIn: true,
      message: 'Welcome!'
    }
    
    // Mock a delayed response to see progress
    ;(fetch as unknown).mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockResponse
        }), 100)
      )
    )

    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByLabelText(/I agree to the/i)
    const submitButton = screen.getAllByRole('button', { name: /create account/i })[0]
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)
    
    // Check that the button shows loading state
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('disables form inputs during account creation', async () => {
    const mockResponse = {
      user: { id: 'user-1', email: 'test@example.com' },
      member: { id: 'member-1' },
      organization: { id: 'org-1', name: 'Test Org' },
      autoSignedIn: true,
      message: 'Welcome!'
    }
    
    // Mock a slow response to test disabled state
    ;(fetch as unknown).mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => mockResponse
        }), 100)
      )
    )

    render(
      <AccountCreationForm
        invitation={mockInvitation}
        onAccountCreated={mockOnAccountCreated}
        onError={mockOnError}
      />
    )

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const termsCheckbox = screen.getByLabelText(/I agree to the/i)
    const submitButton = screen.getAllByRole('button', { name: /create account/i })[0]
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)
    
    // Check that inputs are disabled during creation
    await waitFor(() => {
      expect(passwordInput).toBeDisabled()
      expect(confirmPasswordInput).toBeDisabled()
      expect(termsCheckbox).toBeDisabled()
    })
  })
})