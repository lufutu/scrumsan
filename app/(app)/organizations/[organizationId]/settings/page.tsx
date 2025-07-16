"use client"

import { use } from 'react'
import { Settings } from 'lucide-react'

export default function OrganizationSettingsPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = use(params)
  
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>
      
      <div className="flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Settings page for organization: {organizationId}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This page is under development
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 