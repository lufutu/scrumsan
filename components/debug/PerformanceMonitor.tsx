'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

interface PerformanceMetrics {
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  timeToInteractive: number
  memoryUsage: number
  renderCount: number
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [renderCount, setRenderCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    // Track render count
    setRenderCount(prev => prev + 1)

    // Collect performance metrics
    const collectMetrics = () => {
      if (typeof window === 'undefined') return

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
      const lcp = performance.getEntriesByType('largest-contentful-paint')[0] as any

      const metrics: PerformanceMetrics = {
        pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        firstContentfulPaint: fcp?.startTime || 0,
        largestContentfulPaint: lcp?.startTime || 0,
        timeToInteractive: navigation?.domInteractive - navigation?.fetchStart || 0,
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1048576 || 0, // Convert to MB
        renderCount: renderCount + 1
      }

      setMetrics(metrics)

      // Log slow performance
      if (metrics.pageLoadTime > 3000) {
        logger.warn('Slow page load detected:', {
          loadTime: `${metrics.pageLoadTime}ms`,
          fcp: `${metrics.firstContentfulPaint}ms`,
          lcp: `${metrics.largestContentfulPaint}ms`
        })
      }
    }

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      collectMetrics()
    } else {
      window.addEventListener('load', collectMetrics)
      return () => window.removeEventListener('load', collectMetrics)
    }
  }, [renderCount])

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (process.env.NODE_ENV !== 'development' || !isVisible || !metrics) {
    return null
  }

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'text-green-600'
    if (value < thresholds[1]) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl z-50 font-mono text-xs">
      <div className="mb-2 font-bold text-yellow-400">Performance Monitor</div>
      
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span>Page Load:</span>
          <span className={getPerformanceColor(metrics.pageLoadTime, [1000, 3000])}>
            {metrics.pageLoadTime.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>FCP:</span>
          <span className={getPerformanceColor(metrics.firstContentfulPaint, [1000, 2000])}>
            {metrics.firstContentfulPaint.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>LCP:</span>
          <span className={getPerformanceColor(metrics.largestContentfulPaint, [2500, 4000])}>
            {metrics.largestContentfulPaint.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>TTI:</span>
          <span className={getPerformanceColor(metrics.timeToInteractive, [3800, 7300])}>
            {metrics.timeToInteractive.toFixed(0)}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Memory:</span>
          <span className={getPerformanceColor(metrics.memoryUsage, [50, 100])}>
            {metrics.memoryUsage.toFixed(1)}MB
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span>Renders:</span>
          <span className={getPerformanceColor(metrics.renderCount, [10, 50])}>
            {metrics.renderCount}
          </span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-400">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  )
}