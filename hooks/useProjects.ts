import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { cacheKeys, invalidationPatterns } from '@/lib/query-optimization'

// Generic fetcher function for API requests
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
})

export interface Project {
  id: string
  name: string
  description: string | null
  logo: string | null
  startDate: string | null
  endDate: string | null
  status: string | null
  organizationId: string
  createdBy: string | null
  createdAt: string
  organization?: {
    id: string
    name: string
  }
  members?: Array<{
    id: string
    userId: string
    role: string
    user: {
      id: string
      fullName: string | null
      avatarUrl: string | null
    }
  }>
  boards?: Array<{
    id: string
    name: string
    boardType: string | null
  }>
  _count?: {
    tasks: number
    boards: number
  }
}

export function useProjects(organizationId?: string) {
  const queryClient = useQueryClient()
  
  const params = new URLSearchParams()
  if (organizationId) params.append('organizationId', organizationId)
  
  const { data, error, isLoading, refetch } = useQuery<Project[]>({
    queryKey: cacheKeys.projects(organizationId || ''),
    queryFn: () => fetcher(`/api/projects?${params.toString()}`),
    enabled: !!organizationId,
  })

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: {
      name: string
      description?: string
      logo?: string
      startDate?: string
      endDate?: string
      organizationId: string
    }) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create project')
      }

      return await response.json()
    },
    onMutate: async (newProject) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: cacheKeys.projects(newProject.organizationId) })

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(cacheKeys.projects(newProject.organizationId))

      // Optimistically update the cache
      if (previousProjects) {
        const tempProject: Project = {
          id: `temp-${Date.now()}`,
          name: newProject.name,
          description: newProject.description || null,
          logo: newProject.logo || null,
          startDate: newProject.startDate || null,
          endDate: newProject.endDate || null,
          status: 'active',
          organizationId: newProject.organizationId,
          createdBy: null,
          createdAt: new Date().toISOString(),
        }
        
        queryClient.setQueryData<Project[]>(
          cacheKeys.projects(newProject.organizationId), 
          [...previousProjects, tempProject]
        )
      }

      // Return context for rollback
      return { previousProjects, organizationId: newProject.organizationId }
    },
    onSuccess: (newProject, variables, context) => {
      // Invalidate relevant queries
      const invalidations = invalidationPatterns.projectData(newProject.id, variables.organizationId)
      
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

      toast.success('Project created successfully')
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousProjects && context?.organizationId) {
        queryClient.setQueryData(cacheKeys.projects(context.organizationId), context.previousProjects)
      }
      
      console.error('Failed to create project:', error)
      toast.error(error.message || 'Failed to create project')
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: cacheKeys.projects(variables.organizationId) })
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, projectData }: { 
      projectId: string
      projectData: Partial<Project> 
    }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update project')
      }

      return await response.json()
    },
    onMutate: async ({ projectId, projectData }) => {
      // Find which organization this project belongs to for cache updates
      const allQueries = queryClient.getQueriesData({ queryKey: ['projects'] })
      let organizationId = ''
      
      for (const [queryKey, projects] of allQueries) {
        if (Array.isArray(projects)) {
          const project = projects.find((p: Project) => p.id === projectId)
          if (project) {
            organizationId = project.organizationId
            break
          }
        }
      }

      if (organizationId) {
        await queryClient.cancelQueries({ queryKey: cacheKeys.projects(organizationId) })
        
        const previousProjects = queryClient.getQueryData<Project[]>(cacheKeys.projects(organizationId))
        
        if (previousProjects) {
          const updatedProjects = previousProjects.map(project =>
            project.id === projectId ? { ...project, ...projectData } : project
          )
          queryClient.setQueryData(cacheKeys.projects(organizationId), updatedProjects)
        }
        
        return { previousProjects, organizationId }
      }
    },
    onSuccess: (updatedProject) => {
      // Invalidate relevant queries
      const invalidations = invalidationPatterns.projectData(updatedProject.id, updatedProject.organizationId)
      
      invalidations.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey })
      })

      toast.success('Project updated successfully')
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousProjects && context?.organizationId) {
        queryClient.setQueryData(cacheKeys.projects(context.organizationId), context.previousProjects)
      }
      
      console.error('Failed to update project:', error)
      toast.error(error.message || 'Failed to update project')
    }
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete project')
      }

      return { projectId }
    },
    onMutate: async (projectId) => {
      // Find and optimistically remove the project
      const allQueries = queryClient.getQueriesData({ queryKey: ['projects'] })
      let organizationId = ''
      let previousProjects: Project[] | undefined
      
      for (const [queryKey, projects] of allQueries) {
        if (Array.isArray(projects)) {
          const project = projects.find((p: Project) => p.id === projectId)
          if (project) {
            organizationId = project.organizationId
            previousProjects = projects
            
            await queryClient.cancelQueries({ queryKey: cacheKeys.projects(organizationId) })
            
            const filteredProjects = projects.filter((p: Project) => p.id !== projectId)
            queryClient.setQueryData(cacheKeys.projects(organizationId), filteredProjects)
            break
          }
        }
      }
      
      return { previousProjects, organizationId }
    },
    onSuccess: (_, projectId, context) => {
      // Invalidate navigation data
      if (context?.organizationId) {
        const invalidations = invalidationPatterns.allOrganizationData(context.organizationId)
        invalidations.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      toast.success('Project deleted successfully')
    },
    onError: (error: Error, projectId, context) => {
      // Rollback optimistic update
      if (context?.previousProjects && context?.organizationId) {
        queryClient.setQueryData(cacheKeys.projects(context.organizationId), context.previousProjects)
      }
      
      console.error('Failed to delete project:', error)
      toast.error(error.message || 'Failed to delete project')
    }
  })

  const createProject = useCallback((projectData: Parameters<typeof createProjectMutation.mutate>[0]) => {
    return createProjectMutation.mutateAsync(projectData)
  }, [createProjectMutation])

  const updateProject = useCallback((projectId: string, projectData: Partial<Project>) => {
    return updateProjectMutation.mutateAsync({ projectId, projectData })
  }, [updateProjectMutation])

  const deleteProject = useCallback((projectId: string) => {
    return deleteProjectMutation.mutateAsync(projectId)
  }, [deleteProjectMutation])

  return {
    projects: data,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch,
    // Expose mutation states for better UX
    isCreatingProject: createProjectMutation.isPending,
    isUpdatingProject: updateProjectMutation.isPending,
    isDeletingProject: deleteProjectMutation.isPending,
  }
}

export function useProject(projectId: string) {
  const { data, error, isLoading, refetch } = useQuery<Project>({
    queryKey: cacheKeys.project(projectId),
    queryFn: () => fetcher(`/api/projects/${projectId}`),
    enabled: !!projectId,
  })

  return {
    project: data,
    isLoading,
    error,
    refetch,
  }
}