"use client"

import { use } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Building2, Users, Settings, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppHeader } from '@/components/dashboard/app-header'
import ProjectForm from '@/components/projects/project-form'
import { Tables } from '@/types/database'

type Organization = Tables<'organizations'> & {
  projects?: Tables<'projects'>[]
  _count?: {
    members: number
    projects: number
  }
}

export default function OrganizationDetailsPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = use(params)
  const { } = useSupabase()
  const { toast } = useToast()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/organizations/${organizationId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Failed to fetch organization')
      }
      
      const data = await response.json()
      
      // Get projects for this organization
      const projectsResponse = await fetch(`/api/organizations/${organizationId}/projects`)
      let projects = []
      
      if (projectsResponse.ok) {
        projects = await projectsResponse.json()
      }

      setOrganization({
        ...data,
        projects,
        _count: {
          members: data.members?.length || 0,
          projects: projects.length || 0
        }
      })
    } catch (err: unknown) {
      console.error('Error fetching organization:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organization'
      toast({
        title: "Error",
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, toast])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <>
        <AppHeader 
          title="Organization Not Found"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Organizations', href: '/organizations' },
            { label: 'Not Found', isCurrentPage: true }
          ]}
        />
        <main className="flex-1 overflow-auto">
          <div className="container px-4 py-6">
            <Card>
              <CardContent className="p-6 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Organization not found</h1>
                <Button asChild variant="outline">
                  <Link href="/organizations">
                    Back to Organizations
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    )
  }

  // Custom breadcrumbs for organization page
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Organizations', href: '/organizations' },
    { 
      label: organization.name, 
      icon: <Building2 className="w-4 h-4" />,
      isCurrentPage: true 
    }
  ];

  // Header actions
  const headerActions = (
    <Button asChild variant="outline" size="sm">
      <Link href={`/organizations/${organizationId}/settings`}>
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Link>
    </Button>
  );

  return (
    <>
      <AppHeader 
        title={organization.name}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />
      <main className="flex-1 overflow-auto">
        <div className="container px-4 py-6">
          <div className="space-y-6">
        {/* Organization Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization._count?.projects || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization._count?.members || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

        <Tabs defaultValue="projects" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button onClick={() => setShowProjectForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
          
          <div className="space-y-4">
            {organization.projects?.map(project => (
              <Card key={project.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${project.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {showProjectForm && (
            <div className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <ProjectForm 
                    onSuccess={() => {
                      setShowProjectForm(false)
                      fetchOrganization()
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Members</h2>
            <Button asChild variant="outline">
              <Link href={`/organizations/${organizationId}/members`}>
                <Users className="h-4 w-4 mr-2" />
                Manage Members
              </Link>
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Member management will be displayed here
              </p>
              <Button asChild className="mt-4">
                <Link href={`/organizations/${organizationId}/members`}>
                  View All Members
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
          </div>
        </div>
      </main>
    </>
  )
} 