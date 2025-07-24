import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { toast } from 'sonner'

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/components/ui/enhanced-avatar', () => ({
  EnhancedAvatar: ({ src, fallbackSeed, size, className }: any) => (
    <div 
      data-testid="enhanced-avatar" 
      data-src={src}
      data-fallback-seed={fallbackSeed}
      data-size={size}
      className={className}
    >
      Enhanced Avatar
    </div>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} data-testid="preview-image" />
  ),
}))

// Mock avatar error handling
vi.mock('@/lib/avatar-error-handling', () => ({
  handleAvatarError: vi.fn(() => ({
    type: 'upload_failed',
    message: 'Upload failed',
    canRetry: true,
    retryDelay: 2000
  })),
  validateAvatarFile: vi.fn(() => null), // No validation errors by default
  AvatarErrorType: {
    UPLOAD_FAILED: 'upload_failed',
    FILE_TOO_LARGE: 'file_too_large',
    INVALID_FILE_TYPE: 'invalid_file_type'
  }
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  )
}))

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()

Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
})

describe('AvatarUpload', () => {
  const mockOnUpload = vi.fn()
  const mockOnRemove = vi.fn()
  const mockOnError = vi.fn()
  
  const defaultProps = {
    fallbackSeed: 'test@example.com',
    onUpload: mockOnUpload,
    onRemove: mockOnRemove,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with enhanced avatar and upload button', () => {
      render(<AvatarUpload {...defaultProps} />)
      
      expect(screen.getByTestId('enhanced-avatar')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
    })

    it('shows change button when current avatar exists', () => {
      render(<AvatarUpload {...defaultProps} currentAvatar="https://example.com/avatar.jpg" />)
      
      expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })

    it('shows drop zone when no avatar exists', () => {
      render(<AvatarUpload {...defaultProps} />)
      
      expect(screen.getByText(/upload avatar/i)).toBeInTheDocument()
      expect(screen.getByText(/drag & drop or click to browse/i)).toBeInTheDocument()
    })

    it('displays file type and size information', () => {
      render(<AvatarUpload {...defaultProps} maxSize={3} allowedTypes={['image/jpeg', 'image/png']} />)
      
      expect(screen.getByText(/JPEG, PNG • Max 3MB/i)).toBeInTheDocument()
    })
  })

  describe('File Validation', () => {
    it('validates file type correctly', async () => {
      const avatarErrorHandling = require('@/lib/avatar-error-handling')
      vi.mocked(avatarErrorHandling.validateAvatarFile).mockReturnValueOnce({
        type: 'invalid_file_type',
        message: 'File type not supported. Allowed types: JPEG, PNG, WEBP',
        canRetry: false
      })

      render(<AvatarUpload {...defaultProps} />)
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      
      // Mock file input
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [invalidFile],
        writable: false,
      })
      
      // Simulate file selection
      fireEvent.change(input)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('File type not supported')
        )
      })
    })

    it('validates file size correctly', async () => {
      const avatarErrorHandling = require('@/lib/avatar-error-handling')
      vi.mocked(avatarErrorHandling.validateAvatarFile).mockReturnValueOnce({
        type: 'file_too_large',
        message: 'File size exceeds 1MB limit. Current size: 2.00MB',
        canRetry: false
      })

      render(<AvatarUpload {...defaultProps} maxSize={1} />)
      
      // Create a file larger than 1MB
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      })
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('File size exceeds 1MB limit')
        )
      })
    })

    it('validates minimum image dimensions', async () => {
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock image with small dimensions
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 30,
        height: 30,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger image load with small dimensions
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Image must be at least 50x50 pixels')
      })
    })

    it('handles invalid image files', async () => {
      render(<AvatarUpload {...defaultProps} />)
      
      const invalidImageFile = new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' })
      
      // Mock image that fails to load
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 0,
        height: 0,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [invalidImageFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger image error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror()
      }, 0)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid image file')
      })
    })
  })

  describe('Drag and Drop', () => {
    it('handles drag and drop correctly', async () => {
      render(<AvatarUpload {...defaultProps} />)
      
      const dropZone = screen.getByText(/upload avatar/i).closest('div')
      expect(dropZone).toBeInTheDocument()
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      // Simulate drag over
      fireEvent.dragOver(dropZone!, {
        dataTransfer: {
          items: [{ kind: 'file', type: 'image/jpeg' }],
        },
      })
      
      // Should show drag over state
      expect(dropZone).toHaveClass('border-blue-400', 'bg-blue-50')
      
      // Simulate drop
      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [validFile],
        },
      })
      
      // Trigger image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(validFile)
      })
    })

    it('handles drag leave correctly', () => {
      render(<AvatarUpload {...defaultProps} />)
      
      const dropZone = screen.getByText(/upload avatar/i).closest('div')
      
      // Simulate drag over then drag leave
      fireEvent.dragOver(dropZone!)
      fireEvent.dragLeave(dropZone!)
      
      // Should not have drag over styles
      expect(dropZone).not.toHaveClass('border-blue-400', 'bg-blue-50')
    })

    it('ignores drag and drop when disabled', () => {
      render(<AvatarUpload {...defaultProps} disabled={true} />)
      
      const dropZone = screen.getByText(/upload avatar/i).closest('div')
      
      fireEvent.dragOver(dropZone!)
      
      // Should not show drag over state when disabled
      expect(dropZone).not.toHaveClass('border-blue-400', 'bg-blue-50')
    })
  })

  describe('Preview and Cropping', () => {
    it('shows preview and cropping interface after file selection', async () => {
      render(<AvatarUpload {...defaultProps} enableCropping={true} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })
    })

    it('shows file information in preview', async () => {
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument()
        expect(screen.getByText(/0.00 MB/)).toBeInTheDocument()
      })
    })

    it('shows crop overlay when cropping is enabled', async () => {
      render(<AvatarUpload {...defaultProps} enableCropping={true} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        // Should show crop overlay elements
        const cropOverlay = document.querySelector('.border-dashed')
        expect(cropOverlay).toBeInTheDocument()
      })
    })
  })

  describe('Upload Process', () => {
    it('handles upload process correctly', async () => {
      const user = userEvent.setup()
      mockOnUpload.mockResolvedValue('https://example.com/uploaded-avatar.jpg')
      
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(validFile)
      })
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Avatar uploaded successfully!')
      })
    })

    it('shows upload progress during upload', async () => {
      const user = userEvent.setup()
      
      // Mock a slow upload
      mockOnUpload.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('https://example.com/uploaded-avatar.jpg'), 1000)
      }))
      
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      // Should show uploading state
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument()
        expect(screen.getByTestId('progress')).toBeInTheDocument()
      })
    })

    it('handles upload timeout correctly', async () => {
      const user = userEvent.setup()
      
      // Mock upload that times out
      mockOnUpload.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 100)
      }))
      
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles upload errors with retry functionality', async () => {
      const user = userEvent.setup()
      mockOnUpload.mockRejectedValue(new Error('Upload failed'))
      
      render(<AvatarUpload {...defaultProps} maxRetries={2} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
        expect(screen.getByText(/retry upload \(1\/2\)/i)).toBeInTheDocument()
      })
    })

    it('calls custom error handler on upload failure', async () => {
      const user = userEvent.setup()
      const customError = new Error('Custom upload error')
      mockOnUpload.mockRejectedValue(customError)
      
      render(<AvatarUpload {...defaultProps} onError={mockOnError} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(customError, 'upload')
      })
    })

    it('shows detailed error messages when enabled', async () => {
      const user = userEvent.setup()
      mockOnUpload.mockRejectedValue(new Error('Detailed error message'))
      
      render(<AvatarUpload {...defaultProps} showDetailedErrors={true} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Avatar Removal', () => {
    it('handles remove avatar correctly', async () => {
      const user = userEvent.setup()
      mockOnRemove.mockResolvedValue(undefined)
      
      render(<AvatarUpload {...defaultProps} currentAvatar="https://example.com/avatar.jpg" />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(mockOnRemove).toHaveBeenCalled()
      })
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Avatar removed successfully!')
      })
    })

    it('handles remove avatar errors', async () => {
      const user = userEvent.setup()
      mockOnRemove.mockRejectedValue(new Error('Remove failed'))
      
      render(<AvatarUpload {...defaultProps} currentAvatar="https://example.com/avatar.jpg" />)
      
      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to remove avatar')
      })
    })
  })

  describe('Component States', () => {
    it('disables interactions when disabled prop is true', () => {
      render(<AvatarUpload {...defaultProps} disabled={true} />)
      
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      expect(uploadButton).toBeDisabled()
    })

    it('shows different sizes correctly', () => {
      const { rerender } = render(<AvatarUpload {...defaultProps} size="sm" />)
      
      let avatar = screen.getByTestId('enhanced-avatar')
      expect(avatar).toHaveAttribute('data-size', 'sm')
      
      rerender(<AvatarUpload {...defaultProps} size="xl" />)
      
      avatar = screen.getByTestId('enhanced-avatar')
      expect(avatar).toHaveAttribute('data-size', 'xl')
    })

    it('shows success indicator after successful upload', async () => {
      const user = userEvent.setup()
      mockOnUpload.mockResolvedValue('https://example.com/uploaded-avatar.jpg')
      
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click upload button
      const uploadButton = screen.getByRole('button', { name: /upload/i })
      await user.click(uploadButton)
      
      await waitFor(() => {
        // Should show success indicator
        const successIcon = document.querySelector('.bg-green-500')
        expect(successIcon).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup', () => {
    it('cleans up preview URLs on unmount', () => {
      const { unmount } = render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      unmount()
      
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('handles cancel correctly', async () => {
      const user = userEvent.setup()
      render(<AvatarUpload {...defaultProps} />)
      
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      
      // Mock successful image validation
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        width: 100,
        height: 100,
        src: '',
      }
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage as any)
      
      const input = document.createElement('input')
      input.type = 'file'
      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      })
      
      fireEvent.change(input)
      
      // Trigger successful validation
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)
      
      await waitFor(() => {
        expect(screen.getByText(/preview & crop/i)).toBeInTheDocument()
      })
      
      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/preview & crop/i)).not.toBeInTheDocument()
      })
      
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })
  })
})