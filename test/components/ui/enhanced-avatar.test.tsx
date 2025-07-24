import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock react-nice-avatar
vi.mock('react-nice-avatar', () => ({
  default: ({ style, ...props }: any) => (
    <div 
      data-testid="nice-avatar" 
      style={style}
      data-config={JSON.stringify(props)}
    >
      Generated Avatar
    </div>
  )
}))

// Mock avatar utils with simple implementations
vi.mock('@/lib/avatar-utils', () => ({
  generateCachedAvatarConfig: vi.fn(() => ({
    seed: 'test@example.com',
    config: { 
      sex: 'man',
      faceColor: '#F9C9B6',
      earSize: 'small',
      eyeStyle: 'circle',
      noseStyle: 'short',
      mouthStyle: 'laugh',
      shirtStyle: 'hoody',
      glassesStyle: 'none',
      hairColor: '#000',
      hairStyle: 'normal',
      hatStyle: 'none',
      hatColor: '#000',
      eyeBrowStyle: 'up',
      shirtColor: '#9287FF',
      bgColor: '#74D7EB'
    },
    generatedAt: new Date(),
    version: '1.0'
  })),
  getFallbackSeed: vi.fn((seed: string) => seed || 'default-user')
}))

// Mock avatar error handling
vi.mock('@/lib/avatar-error-handling', () => ({
  handleAvatarError: vi.fn(() => ({
    type: 'display_error',
    message: 'Failed to load avatar',
    canRetry: true,
    retryDelay: 1000
  })),
  createAvatarRetryFunction: vi.fn(),
  AvatarErrorType: {
    DISPLAY_ERROR: 'display_error'
  }
}))

// Mock the UI Avatar components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="ui-avatar" {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt, onError, ...props }: any) => {
    const handleError = (e: any) => {
      if (onError) onError(e)
    }
    return src ? (
      <img 
        src={src} 
        alt={alt} 
        onError={handleError}
        data-testid="avatar-image"
        {...props} 
      />
    ) : null
  },
  AvatarFallback: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="avatar-fallback" {...props}>
      {children}
    </div>
  )
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}))

describe('EnhancedAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with fallback seed when no src provided', () => {
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com" 
          data-testid="enhanced-avatar"
        />
      )
      
      // Should render the nice avatar fallback
      expect(screen.getByTestId('nice-avatar')).toBeInTheDocument()
    })

    it('renders image when src is provided', () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/avatar.jpg"
          fallbackSeed="test@example.com"
          alt="Test Avatar"
        />
      )
      
      // Should render the image
      const img = screen.getByTestId('avatar-image')
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(img).toHaveAttribute('alt', 'Test Avatar')
    })

    it('uses default alt text when not provided', () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/avatar.jpg"
          fallbackSeed="test@example.com"
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      expect(img).toHaveAttribute('alt', 'Avatar for test@example.com')
    })
  })

  describe('Size Variants', () => {
    it('applies size variants correctly', () => {
      const { rerender } = render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          size="sm"
          data-testid="avatar-sm"
        />
      )
      
      expect(screen.getByTestId('avatar-sm')).toHaveClass('size-6')
      
      rerender(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          size="lg"
          data-testid="avatar-lg"
        />
      )
      
      expect(screen.getByTestId('avatar-lg')).toHaveClass('size-12')
    })

    it('applies all size variants correctly', () => {
      const sizes = [
        { size: 'sm', expectedClass: 'size-6' },
        { size: 'md', expectedClass: 'size-8' },
        { size: 'lg', expectedClass: 'size-12' },
        { size: 'xl', expectedClass: 'size-16' },
        { size: '2xl', expectedClass: 'size-20' }
      ] as const

      sizes.forEach(({ size, expectedClass }) => {
        const { unmount } = render(
          <EnhancedAvatar 
            fallbackSeed="test@example.com"
            size={size}
            data-testid={`avatar-${size}`}
          />
        )
        
        expect(screen.getByTestId(`avatar-${size}`)).toHaveClass(expectedClass)
        unmount()
      })
    })

    it('uses default size when not specified', () => {
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          data-testid="avatar-default"
        />
      )
      
      expect(screen.getByTestId('avatar-default')).toHaveClass('size-8')
    })
  })

  describe('Fallback Behavior', () => {
    it('generates initials fallback when avatar config fails', () => {
      // Mock the avatar utils to return null config
      const avatarUtils = require('@/lib/avatar-utils')
      vi.mocked(avatarUtils.generateCachedAvatarConfig).mockReturnValueOnce({ config: null })
      
      render(
        <EnhancedAvatar 
          fallbackSeed="John Doe"
        />
      )
      
      // Should show initials
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('handles email seeds for initials correctly', () => {
      // Mock the avatar utils to return null config
      const avatarUtils = require('@/lib/avatar-utils')
      vi.mocked(avatarUtils.generateCachedAvatarConfig).mockReturnValueOnce({ config: null })
      
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
        />
      )
      
      // Should show first letter of email
      expect(screen.getByText('T')).toBeInTheDocument()
    })

    it('handles single word seeds for initials', () => {
      const avatarUtils = require('@/lib/avatar-utils')
      vi.mocked(avatarUtils.generateCachedAvatarConfig).mockReturnValueOnce({ config: null })
      
      render(
        <EnhancedAvatar 
          fallbackSeed="username"
        />
      )
      
      // Should show first two characters
      expect(screen.getByText('US')).toBeInTheDocument()
    })

    it('uses fallback seeds when primary seed is empty', () => {
      const avatarUtils = require('@/lib/avatar-utils')
      vi.mocked(avatarUtils.getFallbackSeed).mockReturnValue('backup@example.com')
      
      render(
        <EnhancedAvatar 
          fallbackSeed=""
          fallbackSeeds={["backup@example.com", "another@example.com"]}
        />
      )
      
      // Should render the nice avatar (indicating fallback seeds were used)
      expect(screen.getByTestId('nice-avatar')).toBeInTheDocument()
    })

    it('generates consistent avatars with same seed', () => {
      const { rerender } = render(
        <EnhancedAvatar 
          fallbackSeed="consistent@example.com"
          data-testid="avatar-1"
        />
      )
      
      const firstAvatar = screen.getByTestId('nice-avatar')
      const firstConfig = firstAvatar.getAttribute('data-config')
      
      rerender(
        <EnhancedAvatar 
          fallbackSeed="consistent@example.com"
          data-testid="avatar-2"
        />
      )
      
      const secondAvatar = screen.getByTestId('nice-avatar')
      const secondConfig = secondAvatar.getAttribute('data-config')
      
      // Should have the same configuration
      expect(firstConfig).toBe(secondConfig)
    })
  })

  describe('Error Handling', () => {
    it('handles image load errors correctly', async () => {
      const onImageError = vi.fn()
      
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          onImageError={onImageError}
          showErrorHandling={true}
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      
      // Simulate image load error
      fireEvent.error(img)
      
      expect(onImageError).toHaveBeenCalled()
      
      // Should show fallback avatar
      await waitFor(() => {
        expect(screen.getByTestId('nice-avatar')).toBeInTheDocument()
      })
    })

    it('shows retry button after max retries exceeded', async () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          showErrorHandling={true}
          maxRetries={1}
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      
      // Simulate multiple image load errors
      fireEvent.error(img)
      fireEvent.error(img)
      
      await waitFor(() => {
        expect(screen.getByTitle('Retry loading avatar')).toBeInTheDocument()
      })
    })

    it('handles manual retry correctly', async () => {
      const user = userEvent.setup()
      
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          showErrorHandling={true}
          maxRetries={0}
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      fireEvent.error(img)
      
      await waitFor(() => {
        expect(screen.getByTitle('Retry loading avatar')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByTitle('Retry loading avatar')
      await user.click(retryButton)
      
      expect(toast.info).toHaveBeenCalledWith('Retrying avatar load...')
    })

    it('shows error border when error handling is enabled', async () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          showErrorHandling={true}
          data-testid="error-avatar"
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      fireEvent.error(img)
      
      await waitFor(() => {
        expect(screen.getByTestId('error-avatar')).toHaveClass('border-2', 'border-red-200')
      })
    })

    it('calls onAvatarError when avatar generation fails', () => {
      const onAvatarError = vi.fn()
      const avatarUtils = require('@/lib/avatar-utils')
      
      // Mock avatar generation to throw error
      vi.mocked(avatarUtils.generateCachedAvatarConfig).mockImplementationOnce(() => {
        throw new Error('Avatar generation failed')
      })
      
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          onAvatarError={onAvatarError}
        />
      )
      
      expect(onAvatarError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('provides accessibility information for errors', async () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          showErrorHandling={true}
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      fireEvent.error(img)
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert')
        expect(errorAlert).toBeInTheDocument()
        expect(errorAlert).toHaveTextContent('Avatar image failed to load')
      })
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          className="custom-class"
          data-testid="custom-avatar"
        />
      )
      
      expect(screen.getByTestId('custom-avatar')).toHaveClass('custom-class')
    })

    it('applies custom fallback className', () => {
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          fallbackClassName="custom-fallback"
        />
      )
      
      expect(screen.getByTestId('avatar-fallback')).toHaveClass('custom-fallback')
    })
  })

  describe('Loading States', () => {
    it('shows loading indicator during retry', async () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          showErrorHandling={true}
          maxRetries={2}
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      fireEvent.error(img)
      
      // Should show loading indicator during retry
      await waitFor(() => {
        expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument()
      }, { timeout: 100 })
    })
  })

  describe('Upload Functionality', () => {
    it('shows upload overlay when showUploadOnHover is true', () => {
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          showUploadOnHover={true}
          editable={true}
        />
      )
      
      expect(screen.getByText('Upload')).toBeInTheDocument()
    })

    it('does not show upload overlay when not editable', () => {
      render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          showUploadOnHover={true}
          editable={false}
        />
      )
      
      expect(screen.queryByText('Upload')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper alt text for images', () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/avatar.jpg"
          fallbackSeed="test@example.com"
          alt="Custom alt text"
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      expect(img).toHaveAttribute('alt', 'Custom alt text')
    })

    it('provides screen reader information for errors', async () => {
      render(
        <EnhancedAvatar 
          src="https://example.com/broken-image.jpg"
          fallbackSeed="test@example.com"
          showErrorHandling={true}
        />
      )
      
      const img = screen.getByTestId('avatar-image')
      fireEvent.error(img)
      
      await waitFor(() => {
        const srOnly = screen.getByRole('alert')
        expect(srOnly).toHaveClass('sr-only')
      })
    })
  })
})