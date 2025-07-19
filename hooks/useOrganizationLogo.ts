"use client"

import { useState, useEffect } from 'react'

/**
 * Hook to get the logo URL for an organization
 * Uses signed URLs from the API for secure access
 */
export function useOrganizationLogo(organizationId: string, logoFilename: string | null) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!logoFilename || !organizationId) {
      setLogoUrl(null)
      setError(null)
      return
    }

    // Check if it's already a full URL (for backward compatibility)
    if (logoFilename.startsWith('http')) {
      setLogoUrl(logoFilename)
      setError(null)
      return
    }

    const fetchSignedUrl = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get signed URL from API
        const response = await fetch(`/api/organizations/${organizationId}/logo/url`)
        
        if (!response.ok) {
          if (response.status === 404) {
            // No logo found
            setLogoUrl(null)
            return
          }
          throw new Error('Failed to get logo URL')
        }
        
        const data = await response.json()
        setLogoUrl(data.url)
        
      } catch (err) {
        console.error('Error fetching logo URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to load logo')
        setLogoUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSignedUrl()
  }, [organizationId, logoFilename])

  return { logoUrl, isLoading, error }
}

/**
 * Hook to get logo URLs for multiple organizations
 * Uses signed URLs from the API for secure access
 */
export function useOrganizationLogos(organizations: Array<{ id: string; logo: string | null }>) {
  const [logoUrls, setLogoUrls] = useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchAllLogoUrls = async () => {
      setIsLoading(true)
      const newLogoUrls: Record<string, string | null> = {}

      // Process organizations in parallel
      const promises = organizations.map(async (org) => {
        if (!org.logo) {
          newLogoUrls[org.id] = null
          return
        }

        // Check if it's already a full URL (for backward compatibility)
        if (org.logo.startsWith('http')) {
          newLogoUrls[org.id] = org.logo
          return
        }

        try {
          // Get signed URL from API
          const response = await fetch(`/api/organizations/${org.id}/logo/url`)
          
          if (response.ok) {
            const data = await response.json()
            newLogoUrls[org.id] = data.url
          } else {
            // If 404, no logo exists
            newLogoUrls[org.id] = null
          }
        } catch (err) {
          console.error(`Error fetching logo URL for org ${org.id}:`, err)
          newLogoUrls[org.id] = null
        }
      })

      await Promise.all(promises)
      setLogoUrls(newLogoUrls)
      setIsLoading(false)
    }

    if (organizations.length > 0) {
      fetchAllLogoUrls()
    } else {
      setLogoUrls({})
      setIsLoading(false)
    }
  }, [organizations])

  return { logoUrls, isLoading }
} 