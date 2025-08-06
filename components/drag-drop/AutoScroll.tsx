'use client'

import { useEffect, useRef } from 'react'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'

interface AutoScrollProps {
  children: React.ReactNode
  className?: string
  scrollSpeed?: 'slow' | 'standard' | 'fast'
}

/**
 * Wrapper component that enables auto-scrolling when dragging near edges
 * Automatically scrolls the container when dragging items near the top/bottom
 */
export function AutoScroll({ 
  children, 
  className,
  scrollSpeed = 'standard' 
}: AutoScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const getScrollSpeed = () => {
      switch (scrollSpeed) {
        case 'slow': return { speed: 'slow' }
        case 'fast': return { speed: 'fast' }
        default: return { speed: 'standard' }
      }
    }

    return autoScrollForElements({
      element,
      ...getScrollSpeed()
    })
  }, [scrollSpeed])

  return (
    <div ref={scrollRef} className={className}>
      {children}
    </div>
  )
}

/**
 * Hook for enabling auto-scroll on any element
 */
export function useAutoScroll(
  elementRef: React.RefObject<HTMLElement>,
  options?: {
    speed?: 'slow' | 'standard' | 'fast'
    enabled?: boolean
  }
) {
  useEffect(() => {
    const element = elementRef.current
    if (!element || options?.enabled === false) return

    return autoScrollForElements({
      element,
      speed: options?.speed || 'standard'
    })
  }, [elementRef, options?.speed, options?.enabled])
}