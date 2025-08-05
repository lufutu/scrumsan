"use client"

import { useEffect } from 'react'

export function FetchDebugger() {
  useEffect(() => {
    const originalFetch = window.fetch
    
    window.fetch = function(...args: any[]) {
      const url = args[0]
      console.log('🔍 FETCH INTERCEPTED:', url)
      console.trace('Fetch called from:')
      
      // Call original fetch
      return originalFetch.apply(this, args)
    }
    
    return () => {
      window.fetch = originalFetch
    }
  }, [])
  
  return null
}