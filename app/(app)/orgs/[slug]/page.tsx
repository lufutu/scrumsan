"use client"

import { use } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Building2, Users, Settings, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/animate-ui/radix/tabs'
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

export default function OrganizationDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true)

      // Use the new slug-based API endpoint
      const response = await fetch(`/api/orgs/${slug}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Failed to fetch organization')
      }

      const data = await response.json()

      // Get projects for this organization
      const projectsResponse = await fetch(`/api/orgs/${slug}/projects`)
      let projects = []

      if (projectsResponse.ok) {
        projects = await projectsResponse.json()
      }

      setOrganization({
        ...data,
        projects
      })
    } catch (error: any) {
      console.error('Error fetching organization:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
      // Redirect back to organizations list on error
      router.push('/organizations')
    } finally {
      setIsLoading(false)
    }
  }, [slug, toast, router])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  const handleProjectCreated = useCallback(() => {
    setShowProjectForm(false)
    fetchOrganization() // Refresh data
  }, [fetchOrganization])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization not found</h1>
            <p className="text-gray-600 mb-8">The organization you're looking for doesn't exist or you don't have access to it.</p>
            <Button asChild>
              <Link href="/organizations">
                Back to Organizations
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              {organization.logo ? (
                <img src={organization.logo} alt={organization.name} className="w-12 h-12 rounded-lg" />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-gray-600">{organization.description || 'No description provided'}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href={`/orgs/${slug}/settings`}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/orgs/${slug}/members`}>
                <Users className="w-4 h-4 mr-2" />
                Members
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projects</p>
                  <p className="text-2xl font-bold">{organization.projects?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Members</p>
                  <p className="text-2xl font-bold">{organization.members?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Boards</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="boards">Boards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Projects</CardTitle>
                  <ProjectForm onSuccess={handleProjectCreated} />
                </div>
              </CardHeader>
              <CardContent>
                {organization.projects && organization.projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organization.projects.map((project) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                          <p className="text-gray-600 text-sm mb-4">{project.description || 'No description'}</p>
                          <div className="flex gap-2">
                            <Button asChild size="sm">
                              <Link href={`/orgs/${slug}/projects/${project.slug || project.id}`}>
                                View
                              </Link>  
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/orgs/${slug}/projects/${project.slug || project.id}/board`}>
                                Board
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No projects yet</p>
                    <ProjectForm onSuccess={handleProjectCreated} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="boards">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Boards</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Board
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No boards yet</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Board
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}