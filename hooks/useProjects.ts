import useSWR from 'swr'
import { useCallback } from 'react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    console.error('Fetch failed:', res.status, res.statusText, url)
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
  const params = new URLSearchParams()
  if (organizationId) params.append('organizationId', organizationId)
  
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    `/api/projects?${params.toString()}`,
    fetcher
  )

  const createProject = useCallback(async (projectData: {
    name: string
    description?: string
    logo?: string
    startDate?: string
    endDate?: string
    organizationId: string
  }) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create project')
      }

      await mutate()
      toast.success('Project created successfully')
      return await response.json()
    } catch (error: any) {
      console.error('Failed to create project:', error)
      toast.error(error.message || 'Failed to create project')
      throw error
    }
  }, [mutate])

  const updateProject = useCallback(async (projectId: string, projectData: Partial<Project>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update project')
      }

      await mutate()
      toast.success('Project updated successfully')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [mutate])

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete project')
      }

      await mutate()
      toast.success('Project deleted successfully')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }, [mutate])

  return {
    projects: data,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    mutate,
  }
}

export function useProject(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<Project>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher
  )

  return {
    project: data,
    isLoading,
    error,
    mutate,
  }
}