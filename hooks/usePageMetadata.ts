'use client'

import { useEffect } from 'react'

interface PageMetadata {
  title: string
  description?: string
}

export function usePageMetadata({ title, description }: PageMetadata) {
  useEffect(() => {
    // Update document title
    const originalTitle = document.title
    document.title = `${title} | ScrumSan`

    // Update meta description if provided
    let metaDescription: HTMLMetaElement | null = null
    if (description) {
      metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.name = 'description'
        document.head.appendChild(metaDescription)
      }
      const originalDescription = metaDescription.content
      metaDescription.content = description

      return () => {
        document.title = originalTitle
        if (metaDescription) {
          metaDescription.content = originalDescription
        }
      }
    }

    return () => {
      document.title = originalTitle
    }
  }, [title, description])
}