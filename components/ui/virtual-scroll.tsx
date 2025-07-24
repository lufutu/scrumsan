'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * itemHeight

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(items.length - 1, visibleEnd + overscan)

    return { start, end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }))
  }, [items, visibleRange])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  const offsetY = visibleRange.start * itemHeight

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="grid"
      aria-rowcount={items.length}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              role="row"
              aria-rowindex={index + 1}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface VirtualTableProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderHeader: () => React.ReactNode
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
}

export function VirtualTable<T>({
  items,
  itemHeight,
  containerHeight,
  renderHeader,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
}: VirtualTableProps<T>) {
  const headerHeight = 40 // Standard table header height
  const scrollableHeight = containerHeight - headerHeight

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <div className="sticky top-0 z-10 bg-background border-b">
        {renderHeader()}
      </div>
      <VirtualScroll
        items={items}
        itemHeight={itemHeight}
        containerHeight={scrollableHeight}
        renderItem={renderItem}
        overscan={overscan}
        onScroll={onScroll}
      />
    </div>
  )
}

// Hook for managing virtual scroll state
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(items.length - 1, visibleEnd + overscan)

    return { start, end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }))
  }, [items, visibleRange])

  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = index * itemHeight
    setScrollTop(targetScrollTop)
  }, [itemHeight])

  const scrollToTop = useCallback(() => {
    setScrollTop(0)
  }, [])

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    visibleItems,
    scrollToIndex,
    scrollToTop,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.start * itemHeight,
  }
}