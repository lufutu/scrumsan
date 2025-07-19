"use client"

import { useState, useEffect } from 'react'

/**
 * Hook to get signed URL for a task attachment
 */
export function useAttachmentUrl(taskId: string, attachmentId: string, enabled: boolean = true) {
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId || !attachmentId || !enabled) {
      setUrl(null)
      setError(null)
      return
    }

    const fetchSignedUrl = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}/url`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setUrl(null)
            return
          }
          throw new Error('Failed to get attachment URL')
        }
        
        const data = await response.json()
        setUrl(data.url)
        
      } catch (err) {
        console.error('Error fetching attachment URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to load attachment')
        setUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSignedUrl()
  }, [taskId, attachmentId, enabled])

  return { url, isLoading, error }
}

/**
 * Hook to get signed URLs for multiple attachments
 */
export function useAttachmentUrls(taskId: string, attachments: Array<{ id: string; url: string }>) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchAllUrls = async () => {
      if (attachments.length === 0) {
        setUrls({})
        return
      }

      setIsLoading(true)
      const newUrls: Record<string, string> = {}

      // Process attachments in parallel
      const promises = attachments.map(async (attachment) => {
        try {
          // Check if it's already a signed URL or external URL
          if (attachment.url.includes('Signature=') || !attachment.url.includes('s3.amazonaws.com')) {
            newUrls[attachment.id] = attachment.url
            return
          }

          // Get signed URL from API
          const response = await fetch(`/api/tasks/${taskId}/attachments/${attachment.id}/url`)
          
          if (response.ok) {
            const data = await response.json()
            newUrls[attachment.id] = data.url
          } else {
            // Fallback to original URL if API fails
            newUrls[attachment.id] = attachment.url
          }
        } catch (err) {
          console.error(`Error fetching URL for attachment ${attachment.id}:`, err)
          // Fallback to original URL if error
          newUrls[attachment.id] = attachment.url
        }
      })

      await Promise.all(promises)
      setUrls(newUrls)
      setIsLoading(false)
    }

    fetchAllUrls()
  }, [taskId, attachments])

  return { urls, isLoading }
}