"use client"

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Building2, Users, Plus, FolderOpen, LayoutGrid, Calendar, Kanban, Bell, Search, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import VivifyBoardWizard from './vivify-board-wizard'
import { Tables } from '@/types/database'
import { cn } from '@/lib/utils'

type Organization = Tables<'organizations'> & {
  organization_members: Array<Tables<'organization_members'> & {
    user: {
      id: string
      full_name: string | null
      avatar_url: string | null
    } | null
  }>
  projects: Array<Tables<'projects'> & {
    boards?: Array<Tables<'boards'>>
  }>
  standalone_boards?: Array<Tables<'boards'>>
}

interface VivifyOrganizationDashboardProps {
  className?: string
}

export default function VivifyOrganizationDashboard({ className }: VivifyOrganizationDashboardProps) {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchOrganizations()
    }
  }, [user])

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members (
            *,
            user:users (
              id,
              full_name,
              avatar_url
            )
          ),
          projects (
            *,
            boards (*)
          ),
          standalone_boards:boards!boards_organization_id_fkey (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setOrganizations(data || [])
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
      toast({
        title: "Error",
        description: "Failed to load organizations"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getProjectCount = (org: Organization) => {
    return org.projects?.length || 0
  }

  const getBoardCount = (org: Organization) => {
    const projectBoards = org.projects?.reduce((acc, project) => acc + (project.boards?.length || 0), 0) || 0
    const standaloneBoards = org.standalone_boards?.length || 0
    return projectBoards + standaloneBoards
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getOrgColor = (index: number) => {
    const colors = [
      'from-teal-400 to-teal-600',
      'from-blue-400 to-blue-600', 
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600'
    ]
    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">MY ORGANIZATIONS</h1>
          <div className="flex items-center gap-4">
            <Search className="h-5 w-5 text-gray-400" />
            <Bell className="h-5 w-5 text-gray-400" />
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-600 mb-4">ACTIVE ORGANIZATIONS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-full bg-gray-200 rounded-lg"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("container mx-auto px-4 py-8", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">MY ORGANIZATIONS</h1>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <Search className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Active Organizations Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-600 mb-6">ACTIVE ORGANIZATIONS</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Organization Cards */}
          {organizations.map((org, index) => (
            <Link href={`/organizations/${org.id}`} key={org.id}>
              <Card className="h-64 hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden">
                <CardContent className="p-0 h-full">
                  <div className={cn(
                    "h-full bg-gradient-to-br text-white relative",
                    getOrgColor(index)
                  )}>
                    {/* Org Header */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-lg font-bold">
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            getInitials(org.name)
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">{org.name}</h3>
                        </div>
                      </div>

                      {/* Projects Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium opacity-90">PROJECTS</span>
                          <span className="text-xs opacity-75">{getProjectCount(org)}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 h-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Boards Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium opacity-90">BOARDS</span>
                          <span className="text-xs opacity-75">{getBoardCount(org)}</span>
                        </div>
                        <VivifyBoardWizard organizationId={org.id} onSuccess={fetchOrganizations}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 h-8"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </VivifyBoardWizard>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-2">
                        {org.organization_members?.slice(0, 3).filter(member => member.user).map((member, i) => (
                          <Avatar key={member.user!.id} className="w-8 h-8 border-2 border-white/30">
                            <AvatarImage src={member.user!.avatar_url || ''} />
                            <AvatarFallback className="bg-white/20 text-white text-xs">
                              {getInitials(member.user!.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {org.organization_members && org.organization_members.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                            <span className="text-xs font-medium">+{org.organization_members.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Add New Organization Card */}
          <Card className="h-64 hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 border-dashed border-gray-300 hover:border-gray-400">
            <CardContent className="p-6 h-full flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-600">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
                <Plus className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Add new Organization</h3>
              <p className="text-sm text-center opacity-75">Create a new organization to manage your projects and teams</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Import Board Button */}
      <div className="fixed top-6 right-6">
        <Button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm">
          <LayoutGrid className="h-4 w-4 mr-2" />
          IMPORT BOARD
        </Button>
      </div>
    </div>
  )
} 