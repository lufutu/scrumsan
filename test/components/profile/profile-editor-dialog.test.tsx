import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileEditorDialog } from '@/components/profile/profile-editor-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/hooks/useMemberProfile', () => ({
  useMemberProfile: vi.fn(() => ({
    profile: null,
    isLoading: false,
    updateProfile: vi.fn(),
    validateProfileData: vi.fn(() => []),
    getDefaultVisibility: vi.fn(() => ({})),
  })),
}))

vi.mock('@/hooks/useActiveOrg', () => ({
  useActiveOrg: vi.fn(() => ({
    id: 'test-org-id',
    name: 'Test Organization',
  })),
}))

vi.mock('@/providers/supabase-provider', () => ({
  useSupabase: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: null,
      },
    },
  })),
}))

vi.mock('@/lib/aws/s3', () => ({
  uploadAvatarToS3: vi.fn(() => Promise.resolve({
    url: 'https://example.com/avatar.jpg',
    key: 'avatars/test-user-id/avatar.jpg',
    filename: 'avatar.jpg',
  })),
}))

// Mock the AvatarUpload component to avoid complex dependencies
vi.mock('@/components/profile/avatar-upload', () => ({
  AvatarUpload: ({ onUpload, onRemove }: any) => (
    <div data-testid="avatar-upload">
      <button onClick={() => onUpload(new File([''], 'test.jpg', { type: 'image/jpeg' }))}>
        Upload Avatar
      </button>
      <button onClick={onRemove}>Remove Avatar</button>
    </div>
  ),
}))

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('ProfileEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('My Profile')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={false}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByText('My Profile')).not.toBeInTheDocument()
  })

  it('shows correct tabs', () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Avatar')).toBeInTheDocument()
    expect(screen.getByText('Preferences')).toBeInTheDocument()
  })

  it('switches between tabs', async () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        initialTab="profile"
      />
    )

    // Initially on profile tab
    expect(screen.getByText('Personal Information')).toBeInTheDocument()

    // Switch to avatar tab
    fireEvent.click(screen.getByText('Avatar'))
    await waitFor(() => {
      expect(screen.getByText('Profile Avatar')).toBeInTheDocument()
    })

    // Switch to preferences tab
    fireEvent.click(screen.getByText('Preferences'))
    await waitFor(() => {
      expect(screen.getByText('Preferences settings will be available in a future update.')).toBeInTheDocument()
    })
  })

  it('renders profile form fields', () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        initialTab="profile"
      />
    )

    expect(screen.getByLabelText('Secondary Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
    expect(screen.getByLabelText('LinkedIn Profile')).toBeInTheDocument()
    expect(screen.getByLabelText('Skype')).toBeInTheDocument()
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
    expect(screen.getByLabelText('Birthday')).toBeInTheDocument()
    expect(screen.getByLabelText('Marital Status')).toBeInTheDocument()
    expect(screen.getByLabelText('Family Information')).toBeInTheDocument()
    expect(screen.getByLabelText('Other Information')).toBeInTheDocument()
  })

  it('handles form input changes', async () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        initialTab="profile"
      />
    )

    const emailInput = screen.getByLabelText('Secondary Email')
    fireEvent.change(emailInput, { target: { value: 'secondary@example.com' } })

    expect(emailInput).toHaveValue('secondary@example.com')
    
    // Should show unsaved changes badge
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        initialTab="profile"
      />
    )

    const emailInput = screen.getByLabelText('Secondary Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })

  it('renders avatar upload component in avatar tab', () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        initialTab="avatar"
      />
    )

    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument()
    expect(screen.getByText('Upload Avatar')).toBeInTheDocument()
    expect(screen.getByText('Remove Avatar')).toBeInTheDocument()
  })

  it('shows preferences placeholder', () => {
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        initialTab="preferences"
      />
    )

    expect(screen.getByText('Preferences settings will be available in a future update.')).toBeInTheDocument()
  })

  it('calls onClose when dialog is closed', () => {
    const onCloseMock = vi.fn()
    
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={onCloseMock}
      />
    )

    // Find and click the close button (X icon)
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(onCloseMock).toHaveBeenCalled()
  })

  it('shows correct title for own profile vs other user profile', () => {
    // Test own profile
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('My Profile')).toBeInTheDocument()

    // Test other user profile
    renderWithProviders(
      <ProfileEditorDialog
        isOpen={true}
        onClose={vi.fn()}
        userId="other-user-id"
      />
    )
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
  })
})