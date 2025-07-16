"use client"

import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useOrganizationLogo } from '@/hooks/useOrganizationLogo'
import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'
import Image from 'next/image'

interface ActiveOrgDisplayProps {
  showLogo?: boolean
  showDescription?: boolean
  className?: string
}

export function ActiveOrgDisplay({ 
  showLogo = true, 
  showDescription = false,
  className = ""
}: ActiveOrgDisplayProps) {
  const activeOrg = useActiveOrg()
  const { logoUrl } = useOrganizationLogo(activeOrg?.id || '', activeOrg?.logo || null)

  if (!activeOrg) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Building2 className="w-4 h-4" />
        <span className="text-sm">No organization selected</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLogo && (
        <div className="flex items-center justify-center w-6 h-6 rounded border">
          {logoUrl ? (
            <Image 
              src={logoUrl} 
              alt={activeOrg.name} 
              width={24} 
              height={24}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <Building2 className="w-3 h-3" />
          )}
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-medium text-sm">{activeOrg.name}</span>
        {showDescription && activeOrg.description && (
          <span className="text-xs text-muted-foreground">{activeOrg.description}</span>
        )}
      </div>
      <Badge variant="secondary" className="text-xs">Active</Badge>
    </div>
  )
} 