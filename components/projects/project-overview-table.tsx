"use client"

import { useState, useEffect } from 'react'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Users, 
  Kanban, 
  Plus,
  MoreHorizontal,
  Link as LinkIcon,
  Unlink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import ProjectBoardLinker from './project-board-linker'
import ProjectForm from './project-form'

interface ProjectMember {
  id: string
  userId: string
  role: string
  engagement?: string
  hoursPerWeek?: number
  joinedAt: string
  leftAt?: string
  user: {
    id: string
    fullName: string
    avatarUrl?: string
    email?: string
  }
}

interface LinkedBoard {
  id: string
  name: string
  boardType: string
  color?: string
  createdAt: string
  _count: {
    tasks: number
  }
}

interface ProjectOverview {
  id: string
  name: string
  description?: string
  status: string
  startDate?: string
  endDate?: string
  clientName?: string
  clientEmail?: string
  createdAt: string
  members: ProjectMember[]
  boardLinks: {
    id: string
    board: LinkedBoard
  }[]
  _count: {
    members: number
    boardLinks: number
  }
}

export default function ProjectOverviewTable() {
  const activeOrg = useActiveOrg()
  const [projects, setProjects] = useState<ProjectOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (activeOrg?.id) {
      fetchProjects()
    }
  }, [activeOrg?.id])

  const fetchProjects = async () => {
    if (!activeOrg?.id) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/organizations/${activeOrg.id}/projects?overview=true`)
      
      if (!response.ok) throw new Error('Failed to fetch projects')
      
      const data = await response.json()
      setProjects(data)
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-200' },
      completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      on_hold: { label: 'On Hold', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

    return (
      <Badge className={cn('border', config.className)}>
        {config.label}
      </Badge>
    )
  }

  const getEngagementBadge = (engagement?: string) => {
    if (!engagement) return null

    const engagementConfig = {
      full_time: { label: 'Full-time', className: 'bg-green-100 text-green-700' },
      part_time: { label: 'Part-time', className: 'bg-blue-100 text-blue-700' },
      consultant: { label: 'Consultant', className: 'bg-purple-100 text-purple-700' }
    }

    const config = engagementConfig[engagement as keyof typeof engagementConfig]
    if (!config) return null

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'No dates set'
    
    const start = startDate ? new Date(startDate).toLocaleDateString() : 'TBD'
    const end = endDate ? new Date(endDate).toLocaleDateString() : 'Ongoing'
    
    return `${start} - ${end}`
  }

  if (!activeOrg) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">No Organization Selected</h3>
          <p className="text-muted-foreground">Please select an organization to view projects.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projects Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading projects...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Projects Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Team coordination and board management for {activeOrg.name}
            </p>
          </div>
          <ProjectForm onSuccess={fetchProjects}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </ProjectForm>
        </div>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first project to coordinate team work and link boards.
            </p>
            <ProjectForm onSuccess={fetchProjects}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </ProjectForm>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Engagements</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Linked Boards</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <Link 
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex -space-x-2">
                          {project.members.slice(0, 3).map((member) => (
                            <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={member.user.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {member.user.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {project._count.members > 3 && (
                            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                              <span className="text-xs font-medium">
                                +{project._count.members - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {project.members.slice(0, 2).map((member) => (
                            getEngagementBadge(member.engagement)
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{project._count.members} members</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        {project.boardLinks.slice(0, 2).map((link) => (
                          <div key={link.id} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: link.board.color || '#3B82F6' }}
                            />
                            <Link 
                              href={`/boards/${link.board.id}`}
                              className="text-sm hover:underline"
                            >
                              {link.board.name}
                            </Link>
                            <Badge variant="outline" className="text-xs">
                              {link.board.boardType === 'scrum' ? 'Scrum' : 'Kanban'}
                            </Badge>
                          </div>
                        ))}
                        {project._count.boardLinks > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{project._count.boardLinks - 2} more
                          </p>
                        )}
                        {project._count.boardLinks === 0 && (
                          <p className="text-xs text-muted-foreground">No boards linked</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {formatDateRange(project.startDate, project.endDate)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(project.status)}
                    </TableCell>
                    
                    <TableCell>
                      {project.clientName ? (
                        <div className="text-sm">
                          <div className="font-medium">{project.clientName}</div>
                          {project.clientEmail && (
                            <div className="text-muted-foreground">{project.clientEmail}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No client</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <ProjectBoardLinker 
                            projectId={project.id} 
                            onBoardLinked={fetchProjects}
                          >
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Link Board
                            </DropdownMenuItem>
                          </ProjectBoardLinker>
                          <DropdownMenuItem>
                            <Users className="h-4 w-4 mr-2" />
                            Manage Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}