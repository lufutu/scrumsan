// Debug utilities for loading issues

export function debugLoadingState(component: string, state: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Loading Debug] ${component}:`, {
      timestamp: new Date().toISOString(),
      ...state
    });
  }
}

export function createLoadingTimeout(
  name: string, 
  timeoutMs: number = 10000,
  onTimeout?: () => void
) {
  const startTime = Date.now();
  
  const timeoutId = setTimeout(() => {
    const elapsed = Date.now() - startTime;
    console.warn(`[Loading Timeout] ${name} took ${elapsed}ms (timeout: ${timeoutMs}ms)`);
    onTimeout?.();
  }, timeoutMs);

  return {
    clear: () => clearTimeout(timeoutId),
    elapsed: () => Date.now() - startTime
  };
}

export function withLoadingDebug<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    const start = Date.now();
    debugLoadingState(name, { status: 'started', args });
    
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            debugLoadingState(name, { 
              status: 'completed', 
              duration: Date.now() - start,
              success: true 
            });
            return value;
          })
          .catch((error: any) => {
            debugLoadingState(name, { 
              status: 'failed', 
              duration: Date.now() - start,
              error: error.message 
            });
            throw error;
          });
      }
      
      // Handle synchronous results
      debugLoadingState(name, { 
        status: 'completed', 
        duration: Date.now() - start,
        success: true 
      });
      return result;
    } catch (error) {
      debugLoadingState(name, { 
        status: 'failed', 
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }) as T;
}