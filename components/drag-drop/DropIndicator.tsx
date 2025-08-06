'use client'

import { useEffect, useState } from 'react'
// Note: Using custom drop indicator instead of Atlassian's component
import { cn } from '@/lib/utils'

interface DropIndicatorProps {
  edge: 'top' | 'bottom' | 'left' | 'right'
  gap?: string
  className?: string
}

/**
 * Visual indicator that appears when dragging over a valid drop zone
 * Shows where the item will be placed when dropped
 */
export function DropIndicator({ edge, gap = '8px', className }: DropIndicatorProps) {
  const [isActive, setIsActive] = useState(false)

  return (
    <AtlaskitDropIndicator
      edge={edge}
      gap={gap}
    >
      {({ isActive: indicatorActive }) => (
        <div
          className={cn(
            'absolute pointer-events-none transition-all duration-200',
            {
              'opacity-100': indicatorActive,
              'opacity-0': !indicatorActive,
              // Top edge
              'top-0 left-0 right-0 h-0.5': edge === 'top',
              // Bottom edge
              'bottom-0 left-0 right-0 h-0.5': edge === 'bottom',
              // Left edge
              'left-0 top-0 bottom-0 w-0.5': edge === 'left',
              // Right edge
              'right-0 top-0 bottom-0 w-0.5': edge === 'right',
            },
            // Default color is blue, can be overridden
            'bg-blue-500',
            className
          )}
        />
      )}
    </AtlaskitDropIndicator>
  )
}

/**
 * Line indicator for showing drop position between items
 */
export function LineDropIndicator({ 
  orientation = 'horizontal',
  className 
}: { 
  orientation?: 'horizontal' | 'vertical'
  className?: string 
}) {
  return (
    <div 
      className={cn(
        'pointer-events-none bg-blue-500 rounded-full',
        orientation === 'horizontal' ? 'h-0.5 w-full' : 'w-0.5 h-full',
        className
      )}
    />
  )
}

/**
 * Animated drop zone highlight
 */
export function DropZoneHighlight({ 
  isActive,
  children,
  className 
}: { 
  isActive: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div 
      className={cn(
        'relative transition-all duration-200',
        isActive && 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50/30',
        className
      )}
    >
      {children}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-blue-400 opacity-5 animate-pulse" />
        </div>
      )}
    </div>
  )
}