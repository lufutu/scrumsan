"use client"

import { useState, useEffect } from 'react'
import { getOrganizationLogoSignedUrl, checkOrganizationLogoExists, listOrganizationLogos } from '@/lib/supabase/storage'

/**
 * Hook to get the logo URL for an organization
 * Handles the conversion from stored filename to actual URL
 */
export function useOrganizationLogo(organizationId: string, logoFilename: string | null) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!logoFilename || !organizationId) {
      setLogoUrl(null)
      return
    }

    // Check if it's already a full URL (for backward compatibility)
    if (logoFilename.startsWith('http')) {
      setLogoUrl(logoFilename)
      return
    }

    const checkAndGenerateUrl = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Check if file exists first
        const fileExists = await checkOrganizationLogoExists(organizationId, logoFilename)
        
        if (!fileExists) {
          setLogoUrl(null)
          setError(`Logo file not found: ${logoFilename}`)
          return
        }
        
        // Generate signed URL from filename
        const url = await getOrganizationLogoSignedUrl(organizationId, logoFilename)
        setLogoUrl(url)
      } catch (err) {
        console.error('Error generating logo URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate logo URL')
        setLogoUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAndGenerateUrl()
  }, [organizationId, logoFilename])

  return { logoUrl, isLoading, error }
}

/**
 * Hook to get logo URLs for multiple organizations
 * Useful for lists of organizations
 */
export function useOrganizationLogos(organizations: Array<{ id: string; logo: string | null }>) {
  const [logoUrls, setLogoUrls] = useState<Record<string, string | null>>({})

  useEffect(() => {
    const generateLogoUrls = async () => {
      const newLogoUrls: Record<string, string | null> = {}

      for (const org of organizations) {
        if (!org.logo) {
          newLogoUrls[org.id] = null
          continue
        }

        // Check if it's already a full URL (for backward compatibility)
        if (org.logo.startsWith('http')) {
          newLogoUrls[org.id] = org.logo
          continue
        }

        try {
          // Check if file exists first
          const fileExists = await checkOrganizationLogoExists(org.id, org.logo)
          
          if (fileExists) {
            // Generate signed URL from filename
            const url = await getOrganizationLogoSignedUrl(org.id, org.logo)
            newLogoUrls[org.id] = url
          } else {
            newLogoUrls[org.id] = null
          }
        } catch (err) {
          console.error(`Error generating logo URL for org ${org.id}:`, err)
          newLogoUrls[org.id] = null
        }
      }

      setLogoUrls(newLogoUrls)
    }

    generateLogoUrls()
  }, [organizations])

  return logoUrls
} 