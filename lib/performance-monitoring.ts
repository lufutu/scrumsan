/**
 * Performance monitoring utilities for team management features
 */

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean = process.env.NODE_ENV === 'development'

  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    })
  }

  end(name: string): number | null {
    if (!this.enabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`, metric.metadata)
    }

    return duration
  }

  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata)
    try {
      const result = fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    this.start(name, metadata)
    try {
      const result = await fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.duration !== undefined)
  }

  clear(): void {
    this.metrics.clear()
  }

  // Team management specific metrics
  measureQuery(queryName: string, itemCount: number, filters?: any) {
    return this.measure(`query:${queryName}`, () => {}, {
      itemCount,
      filters: filters ? Object.keys(filters).length : 0,
      hasFilters: !!filters,
    })
  }

  measureRender(componentName: string, itemCount: number, isVirtual?: boolean) {
    return this.measure(`render:${componentName}`, () => {}, {
      itemCount,
      isVirtual: !!isVirtual,
      renderType: isVirtual ? 'virtual' : 'standard',
    })
  }

  measureFilter(filterType: string, inputSize: number, outputSize: number) {
    return this.measure(`filter:${filterType}`, () => {}, {
      inputSize,
      outputSize,
      reductionRatio: inputSize > 0 ? (outputSize / inputSize) : 0,
    })
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    start: performanceMonitor.start.bind(performanceMonitor),
    end: performanceMonitor.end.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureQuery: performanceMonitor.measureQuery.bind(performanceMonitor),
    measureRender: performanceMonitor.measureRender.bind(performanceMonitor),
    measureFilter: performanceMonitor.measureFilter.bind(performanceMonitor),
  }
}

// Performance optimization recommendations
export function getPerformanceRecommendations(metrics: PerformanceMetric[]): string[] {
  const recommendations: string[] = []

  // Check for slow queries
  const slowQueries = metrics.filter(m => 
    m.name.startsWith('query:') && m.duration && m.duration > 500
  )
  if (slowQueries.length > 0) {
    recommendations.push('Consider enabling database indexing for slow queries')
    recommendations.push('Use lightweight queries for list views')
  }

  // Check for large datasets
  const largeDatasets = metrics.filter(m => 
    m.metadata?.itemCount && m.metadata.itemCount > 100
  )
  if (largeDatasets.length > 0) {
    recommendations.push('Enable virtual scrolling for large lists')
    recommendations.push('Implement pagination for better performance')
  }

  // Check for slow renders
  const slowRenders = metrics.filter(m => 
    m.name.startsWith('render:') && m.duration && m.duration > 100
  )
  if (slowRenders.length > 0) {
    recommendations.push('Consider memoizing expensive components')
    recommendations.push('Use React.memo for list items')
  }

  // Check for inefficient filters
  const inefficientFilters = metrics.filter(m => 
    m.name.startsWith('filter:') && 
    m.metadata?.reductionRatio && 
    m.metadata.reductionRatio < 0.1
  )
  if (inefficientFilters.length > 0) {
    recommendations.push('Move filtering to server-side for better performance')
  }

  return recommendations
}

// Cache performance utilities
export class CachePerformanceTracker {
  private hitCount = 0
  private missCount = 0
  private totalRequests = 0

  recordHit(): void {
    this.hitCount++
    this.totalRequests++
  }

  recordMiss(): void {
    this.missCount++
    this.totalRequests++
  }

  getHitRatio(): number {
    return this.totalRequests > 0 ? this.hitCount / this.totalRequests : 0
  }

  getStats() {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      total: this.totalRequests,
      hitRatio: this.getHitRatio(),
    }
  }

  reset(): void {
    this.hitCount = 0
    this.missCount = 0
    this.totalRequests = 0
  }
}

// Global cache tracker
export const cacheTracker = new CachePerformanceTracker()

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number
  total: number
  percentage: number
} | null {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    }
  }
  return null
}

// Bundle size analyzer for development
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Analysis')
    console.log('Team Management Components loaded')
    console.log('React Query cache size:', 'N/A') // Would need actual implementation
    console.log('Memory usage:', getMemoryUsage())
    console.groupEnd()
  }
}