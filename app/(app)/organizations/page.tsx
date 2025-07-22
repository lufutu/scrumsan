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
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
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
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        }
      />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">

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
        </div>
      </main>
    </>
  )
} 