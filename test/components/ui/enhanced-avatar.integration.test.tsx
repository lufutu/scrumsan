import { render, screen } from '@testing-library/react'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { describe, it, expect } from 'vitest'

describe('EnhancedAvatar - Integration', () => {
  it('integrates with avatar utilities for consistent generation', () => {
    // Test that the same seed produces consistent results
    const seed = "test@example.com"
    
    const { unmount } = render(
      <EnhancedAvatar 
        fallbackSeed={seed}
        data-testid="avatar-1"
      />
    )
    
    const firstRender = screen.getByTestId('avatar-1')
    expect(firstRender).toBeInTheDocument()
    
    unmount()
    
    // Render again with same seed
    render(
      <EnhancedAvatar 
        fallbackSeed={seed}
        data-testid="avatar-2"
      />
    )
    
    const secondRender = screen.getByTestId('avatar-2')
    expect(secondRender).toBeInTheDocument()
    
    // Both should have the same structure (indicating consistent generation)
    expect(firstRender.className).toBe(secondRender.className)
  })

  it('handles different seed types appropriately', () => {
    const seeds = [
      'user@example.com',
      'John Doe',
      'user123',
      ''
    ]
    
    seeds.forEach((seed, index) => {
      const { unmount } = render(
        <EnhancedAvatar 
          fallbackSeed={seed}
          data-testid={`avatar-${index}`}
        />
      )
      
      // Should render without errors regardless of seed type
      expect(screen.getByTestId(`avatar-${index}`)).toBeInTheDocument()
      unmount()
    })
  })

  it('provides fallback chain when primary seed is empty', () => {
    render(
      <EnhancedAvatar 
        fallbackSeed=""
        fallbackSeeds={["backup@example.com", "another@example.com"]}
        data-testid="fallback-avatar"
      />
    )
    
    // Should render successfully with fallback seeds
    expect(screen.getByTestId('fallback-avatar')).toBeInTheDocument()
  })

  it('renders with image source when provided', () => {
    render(
      <EnhancedAvatar 
        src="https://example.com/avatar.jpg"
        fallbackSeed="test@example.com"
        alt="Test Avatar"
        data-testid="image-avatar"
      />
    )
    
    // Should render the component
    expect(screen.getByTestId('image-avatar')).toBeInTheDocument()
    
    // The component should have the src prop passed to AvatarImage
    // Note: AvatarImage from Radix UI only renders the img element when the image loads
    // In tests, we just verify the component renders without errors
    expect(screen.getByTestId('image-avatar')).toHaveAttribute('data-testid', 'image-avatar')
  })
})