"use client"

import { useState, useEffect } from 'react'
import { useOrganization } from '@/providers/organization-provider'
import { useOptimizedNavDataMultiple } from '@/hooks/useOptimizedNavData'
import { ChevronRight, Building2, FolderOpen, Kanban, Calendar, Plus, Zap, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/animate-ui/radix/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/animate-ui/radix/collapsible'
import BoardCreationWizard from '@/components/projects/board-creation-wizard-simple'
import { Tables } from '@/types/database'

type Project = Tables<'projects'> & {
  boards?: Tables<'boards'>[]
}

type Board = Tables<'boards'> & {
  boardType?: string | null
}

type Sprint = {
  id: string
  name: string
  goal?: string | null
  status?: string | null
  boardId?: string | null
  projectId?: string | null
}

type Organization = Tables<'organizations'> & {
  projects?: Project[]
  boards?: Board[] // standalone boards
  activeSprints?: Sprint[] // active sprints
}

interface ExpandableNavProps {
  className?: string
}

export function ExpandableNav({ className }: ExpandableNavProps) {
  const { organizations, activeOrg } = useOrganization()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  // Use optimized SWR-based data fetching instead of manual fetch calls
  const organizationIds = organizations.map(org => org.id)
  const { data: orgData, isLoading } = useOptimizedNavDataMultiple(organizationIds)

  // SWR handles data fetching automatically, no need for manual effects

  useEffect(() => {
    // Auto-expand active organization
    if (activeOrg?.id) {
      setExpandedOrgs(prev => new Set([...prev, activeOrg.id]))
    }
  }, [activeOrg?.id])

  // Separate effect for route-based expansion to avoid frequent re-runs
  useEffect(() => {
    // Auto-expand based on current route
    if (pathname.startsWith('/boards/') && orgData.length > 0) {
      const boardId = pathname.split('/')[2]
      if (boardId) {
        // Find which organization and project this board belongs to
        orgData.forEach(org => {
          setExpandedOrgs(prev => new Set([...prev, org.id]))
          
          org.projects?.forEach(project => {
            const projectHasBoard = project.boardLinks?.some(link => link.board.id === boardId)
            if (projectHasBoard) {
              setExpandedProjects(prev => new Set([...prev, project.id]))
            }
          })
        })
      }
    }
  }, [pathname]) // Remove orgData from dependencies to prevent frequent re-runs

  // Redirect handler for board creation
  const handleBoardCreatedWithRedirect = async (newBoard?: { id?: string }) => {
    // Refresh the data first
    // SWR will automatically revalidate data
    
    // Then redirect to the new board
    if (newBoard?.id) {
      router.push(`/boards/${newBoard.id}`)
    }
  }

  // fetchOrgData function removed - now using SWR-based useOptimizedNavDataMultiple

  const toggleOrgExpansion = (orgId: string) => {
    setExpandedOrgs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orgId)) {
        newSet.delete(orgId)
      } else {
        newSet.add(orgId)
      }
      return newSet
    })
  }

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const getBoardIcon = (boardType?: string | null) => {
    return boardType === 'scrum' ? Calendar : Kanban
  }

  const getBoardTypeLabel = (boardType?: string | null) => {
    return boardType === 'scrum' ? 'Scrum' : 'Kanban'
  }

  if (isLoading) {
    return (
      <SidebarGroup className={className}>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-8 bg-muted rounded animate-pulse" />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {orgData.map((org) => {
            const isExpanded = expandedOrgs.has(org.id)
            const hasProjects = org.projects && org.projects.length > 0
            const hasStandaloneBoards = org.boards && org.boards.length > 0
            const hasActiveSprints = org.activeSprints && org.activeSprints.length > 0
            const hasContent = hasProjects || hasStandaloneBoards || hasActiveSprints

            return (
              <Collapsible key={org.id} open={isExpanded} onOpenChange={() => toggleOrgExpansion(org.id)} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={org.name}
                      className={cn(
                        "w-full justify-between group",
                        activeOrg?.id === org.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{org.name}</span>
                      </div>
                      {hasContent && (
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Projects */}
                      {org.projects?.map((project) => {
                        const projectBoards = project.boardLinks?.map(link => link.board) || []
                        const hasBoards = projectBoards.length > 0
                        const isProjectExpanded = expandedProjects.has(project.id)

                        return (
                          <div key={project.id}>
                            {/* Project Details Link */}
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                className={cn(
                                  pathname === `/projects/${project.id}` && 
                                  "bg-sidebar-accent text-sidebar-accent-foreground"
                                )}
                              >
                                <Link href={`/projects/${project.id}`} className="flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4" />
                                  <span className="truncate">{project.name}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>

                            {/* Project Boards (if any) */}
                            {hasBoards && (
                              <Collapsible 
                                open={isProjectExpanded} 
                                onOpenChange={() => toggleProjectExpansion(project.id)}
                                className="group/boards"
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton className="text-muted-foreground group/boards">
                                      <ChevronRight className="h-3 w-3 transition-transform duration-300 group-data-[state=open]/boards:rotate-90" />
                                      <span className="text-xs">Boards ({projectBoards.length})</span>
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent>
                                    <SidebarMenuSub>
                                      {projectBoards.map((board) => {
                                        const BoardIcon = getBoardIcon(board.boardType)
                                        // Use slug-based URL when both board and org have slugs, fallback to UUID
                                        const boardPath = board.slug && org.slug 
                                          ? `/orgs/${org.slug}/boards/${board.slug}` 
                                          : `/boards/${board.id}`
                                        
                                        return (
                                          <SidebarMenuSubItem key={board.id}>
                                            <SidebarMenuSubButton
                                              asChild
                                              className={cn(
                                                (pathname === boardPath || pathname === `/boards/${board.id}`) && 
                                                "bg-sidebar-accent text-sidebar-accent-foreground"
                                              )}
                                            >
                                              <Link href={boardPath} className="flex items-center gap-2">
                                                <BoardIcon className="h-3 w-3" />
                                                <span className="truncate">{board.name}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                  {getBoardTypeLabel(board.boardType)}
                                                </span>
                                              </Link>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        )
                                      })}
                                      
                                      {/* Add Board to Project */}
                                      <SidebarMenuSubItem>
                                        <BoardCreationWizard 
                                          projectId={project.id}
                                          onSuccess={handleBoardCreatedWithRedirect}
                                        >
                                          <SidebarMenuSubButton className="text-muted-foreground hover:text-foreground">
                                            <Plus className="h-3 w-3" />
                                            <span>Add Board</span>
                                          </SidebarMenuSubButton>
                                        </BoardCreationWizard>
                                      </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            )}
                          </div>
                        )
                      })}

                      {/* Standalone Boards */}
                      {org.boards?.map((board) => {
                        const BoardIcon = getBoardIcon(board.boardType)
                        // Use slug-based URL when both board and org have slugs, fallback to UUID
                        const boardPath = board.slug && org.slug 
                          ? `/orgs/${org.slug}/boards/${board.slug}` 
                          : `/boards/${board.id}`
                        
                        return (
                          <SidebarMenuSubItem key={board.id}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                (pathname === boardPath || pathname === `/boards/${board.id}`) && 
                                "bg-sidebar-accent text-sidebar-accent-foreground"
                              )}
                            >
                              <Link href={boardPath} className="flex items-center gap-2">
                                <BoardIcon className="h-4 w-4" />
                                <span className="truncate">{board.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {getBoardTypeLabel(board.boardType)}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}

                      {/* Active Sprints */}
                      {org.activeSprints?.map((sprint) => (
                        <SidebarMenuSubItem key={sprint.id}>
                          <SidebarMenuSubButton
                            asChild
                            className={cn(
                              pathname === `/sprints/${sprint.id}/active` && 
                              "bg-sidebar-accent text-sidebar-accent-foreground"
                            )}
                          >
                            <Link href={`/sprints/${sprint.id}/active`} className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-green-600" />
                              <span className="truncate">{sprint.name}</span>
                              <span className="text-xs text-green-600 ml-auto font-medium">
                                Active Sprint
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}

                      {/* Team Management */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          className={cn(
                            pathname === `/organizations/${org.id}/members` && 
                            "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          <Link href={`/organizations/${org.id}/members`} className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Team Management</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {/* Add Project to Organization */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton 
                          asChild 
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Link href={`/organizations/${org.id}`}>
                            <Plus className="h-4 w-4" />
                            <span>Add Project</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      {/* Add Standalone Board */}
                      <SidebarMenuSubItem>
                        <BoardCreationWizard 
                          organizationId={org.id}
                          onSuccess={handleBoardCreatedWithRedirect}
                        >
                          <SidebarMenuSubButton className="text-muted-foreground hover:text-foreground">
                            <Plus className="h-4 w-4" />
                            <span>Add Board</span>
                          </SidebarMenuSubButton>
                        </BoardCreationWizard>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
} 