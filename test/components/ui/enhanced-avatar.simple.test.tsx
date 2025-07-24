import { render, screen } from '@testing-library/react'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { describe, it, expect } from 'vitest'

describe('EnhancedAvatar - Basic Functionality', () => {
  it('renders without crashing', () => {
    render(
      <EnhancedAvatar 
        fallbackSeed="test@example.com" 
        data-testid="enhanced-avatar"
      />
    )
    
    // Should render the component
    expect(screen.getByTestId('enhanced-avatar')).toBeInTheDocument()
  })

  it('applies size classes correctly', () => {
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
    
    rerender(
      <EnhancedAvatar 
        fallbackSeed="test@example.com"
        size="xl"
        data-testid="avatar-xl"
      />
    )
    
    expect(screen.getByTestId('avatar-xl')).toHaveClass('size-16')
  })

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

  it('renders with default medium size when no size specified', () => {
    render(
      <EnhancedAvatar 
        fallbackSeed="test@example.com"
        data-testid="default-avatar"
      />
    )
    
    expect(screen.getByTestId('default-avatar')).toHaveClass('size-8')
  })

  it('accepts all size variants', () => {
    const sizes = ['sm', 'md', 'lg', 'xl', '2xl'] as const
    const expectedClasses = ['size-6', 'size-8', 'size-12', 'size-16', 'size-20']
    
    sizes.forEach((size, index) => {
      const { unmount } = render(
        <EnhancedAvatar 
          fallbackSeed="test@example.com"
          size={size}
          data-testid={`avatar-${size}`}
        />
      )
      
      expect(screen.getByTestId(`avatar-${size}`)).toHaveClass(expectedClasses[index])
      unmount()
    })
  })
})