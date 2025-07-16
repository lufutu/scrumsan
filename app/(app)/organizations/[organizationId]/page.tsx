"use client"

import { use } from 'react'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Building2, ArrowLeft, Users, Settings, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProjectList from '@/components/projects/project-list'
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
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)

  useEffect(() => {
    fetchOrganization()
  }, [organizationId])

  const fetchOrganization = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          projects (*)
        `)
        .eq('id', organizationId)
        .single()

      if (error) throw error

      // Get member count
      const { count: memberCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)

      setOrganization({
        ...data,
        _count: {
          members: memberCount || 0,
          projects: data.projects?.length || 0
        }
      })
    } catch (err: unknown) {
      console.error('Error fetching organization:', err)
      toast({
        title: "Error",
        description: "Failed to load organization"
      })
    } finally {
      setIsLoading(false)
    }
  }

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
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Organization not found</h1>
            <Button asChild variant="outline">
              <Link href="/organizations">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Organizations
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/organizations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              <p className="text-muted-foreground">{organization.description}</p>
            </div>
          </div>
        </div>
        
        <Button asChild variant="outline">
          <Link href={`/organizations/${organizationId}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>

      {/* Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
  )
} 