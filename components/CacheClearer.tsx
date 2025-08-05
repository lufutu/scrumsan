"use client"

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function CacheClearer() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    // Clear all React Query cache on mount to avoid slug/UUID conflicts
    console.log('Clearing React Query cache to avoid conflicts...')
    queryClient.clear()
  }, [queryClient])
  
  return null
}