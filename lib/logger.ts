/**
 * Logger utility that only outputs in development environment
 * Use this instead of console.log/warn/error throughout the application
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log general information (replaces console.log)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args)
    }
  },

  /**
   * Log informational messages
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Log warning messages
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  /**
   * Log error messages - always shown in production for critical errors
   * Use logger.debug for non-critical errors that should be hidden in production
   */
  error: (...args: any[]) => {
    // Always log errors to help with production debugging
    console.error('[ERROR]', ...args)
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args)
    }
  },

  /**
   * Log performance metrics
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(`[PERF] ${label}`)
    }
  },

  /**
   * End performance metric logging
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(`[PERF] ${label}`)
    }
  },

  /**
   * Log table data (useful for debugging arrays/objects)
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data)
    }
  },

  /**
   * Group related logs together
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(`[GROUP] ${label}`)
    }
  },

  /**
   * End log grouping
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },

  /**
   * Assert a condition and log if it fails
   */
  assert: (condition: boolean, ...args: any[]) => {
    if (isDevelopment) {
      console.assert(condition, '[ASSERT]', ...args)
    }
  },

  /**
   * Log with custom styling (development only)
   */
  styled: (message: string, style: string) => {
    if (isDevelopment) {
      console.log(`%c${message}`, style)
    }
  },

  /**
   * Log API requests/responses for debugging
   */
  api: {
    request: (method: string, url: string, data?: any) => {
      if (isDevelopment) {
        console.log(`[API] → ${method} ${url}`, data || '')
      }
    },
    response: (method: string, url: string, status: number, data?: any) => {
      if (isDevelopment) {
        const statusColor = status >= 200 && status < 300 ? '✓' : '✗'
        console.log(`[API] ← ${statusColor} ${method} ${url} (${status})`, data || '')
      }
    },
    error: (method: string, url: string, error: any) => {
      if (isDevelopment) {
        console.error(`[API] ✗ ${method} ${url}`, error)
      }
    }
  },

  /**
   * Log database queries (Prisma)
   */
  db: {
    query: (operation: string, model: string, args?: any) => {
      if (isDevelopment) {
        console.log(`[DB] ${operation} ${model}`, args || '')
      }
    },
    error: (operation: string, model: string, error: any) => {
      if (isDevelopment) {
        console.error(`[DB] Error in ${operation} ${model}:`, error)
      }
    }
  },

  /**
   * Log React component lifecycle
   */
  component: {
    mount: (name: string, props?: any) => {
      if (isDevelopment) {
        console.log(`[COMPONENT] ↑ ${name} mounted`, props || '')
      }
    },
    unmount: (name: string) => {
      if (isDevelopment) {
        console.log(`[COMPONENT] ↓ ${name} unmounted`)
      }
    },
    render: (name: string, reason?: string) => {
      if (isDevelopment) {
        console.log(`[COMPONENT] ⟲ ${name} rendered${reason ? `: ${reason}` : ''}`)
      }
    }
  }
}

// Export a default instance for convenience
export default logger