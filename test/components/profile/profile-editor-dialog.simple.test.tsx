import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProfileEditorDialog } from '@/components/profile/profile-editor-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Simple mocks to avoid memory issues
vi.mock('@/hooks/useMemberProfile', () => ({
  useMemberProfile: () => ({
    profile: null,
    isLoading: false,
    updateProfile: vi.fn(),
    validateProfileData: () => [],
    getDefaultVisibility: () => ({}),
  }),
}))

vi.mock('@/hooks/useActiveOrg', () => ({
  useActiveOrg: () => ({ id: 'test-org' }),
}))

vi.mock('@/providers/supabase-provider', () => ({
  useSupabase: () => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
  }),
}))

vi.mock('@/components/profile/avatar-upload', () => ({
  AvatarUpload: () => <div data-testid="avatar-upload">Avatar Upload</div>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

describe('ProfileEditorDialog - Basic Functionality', () => {
  it('renders when open', () => {
    const queryClient = createQueryClient()
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileEditorDialog isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    )

    expect(screen.getByText('My Profile')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const queryClient = createQueryClient()
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileEditorDialog isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    )

    expect(screen.queryByText('My Profile')).not.toBeInTheDocument()
  })

  it('shows profile tab by default', () => {
    const queryClient = createQueryClient()
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileEditorDialog isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    )

    expect(screen.getByText('Personal Information')).toBeInTheDocument()
  })
})