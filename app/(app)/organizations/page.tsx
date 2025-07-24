'use client'

import { useOrganization } from '@/providers/organization-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings, Building2 } from 'lucide-react'
import { CreateOrganizationDialog } from '@/components/organizations/create-organization-dialog'
import { EditOrganizationDialog } from '@/components/organizations/edit-organization-dialog'
import { AppHeader } from '@/components/dashboard/app-header'
import { useState } from 'react'
import { Organization } from '@/hooks/useOrganizations'
import { PageLoadingState } from '@/components/ui/loading-state'
import { PageErrorState } from '@/components/ui/error-state'
import { OrganizationEmptyState } from '@/components/ui/empty-state'

export default function OrganizationsPage() {
  const { organizations, isLoading, error } = useOrganization()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)

  const handleEditOrganization = (org: Organization) => {
    setEditingOrganization(org)
    setIsEditDialogOpen(true)
  }

  if (isLoading) {
    return (
      <>
        <AppHeader
          title="Organizations"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Organizations', icon: <Building2 className="w-4 h-4" />, isCurrentPage: true }
          ]}
        />
        <PageLoadingState message="Loading organizations..." />
      </>
    )
  }

  if (error) {
    return (
      <>
        <AppHeader
          title="Organizations"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Organizations', icon: <Building2 className="w-4 h-4" />, isCurrentPage: true }
          ]}
        />
        <PageErrorState
          error={error}
          onRetry={() => window.location.reload()}
          onGoHome={() => window.location.href = '/'}
        />
      </>
    )
  }

  return (
    <>
      <AppHeader
        title="Organizations"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Organizations', icon: <Building2 className="w-4 h-4" />, isCurrentPage: true }
        ]}
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)} data-org-creation-trigger>
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        }
      />
      <div className="px-4 py-6 space-y-6">

        {organizations && organizations.length === 0 ? (
          <OrganizationEmptyState
            onCreateOrg={() => {
              const createButton = document.querySelector('[data-org-creation-trigger]')
              if (createButton instanceof HTMLElement) {
                createButton.click()
              }
            }}
            className="min-h-[60vh]"
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations?.map((org) => (
              <Card key={org.id} className="flex flex-col">
                <CardHeader className="flex-1">
                  <CardTitle className="flex items-center justify-between">
                    {org.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditOrganization(org)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {org.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {org.members?.length || 0} members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateOrganizationDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        {editingOrganization && (
          <EditOrganizationDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            organization={editingOrganization}
          />
        )}
      </div>
    </>
  )
} 