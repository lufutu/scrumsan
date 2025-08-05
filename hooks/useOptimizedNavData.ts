import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import { cacheKeys } from '@/lib/query-optimization'

// Generic fetcher function for API requests
const fetcher = (url: string) => {
  console.log('useOptimizedNavData fetcher called with URL:', url)
  return fetch(url).then(res => {
    console.log('useOptimizedNavData fetch response:', { url, status: res.status, ok: res.ok })
    if (!res.ok) {
      throw new Error('Failed to fetch')
    }
    return res.json()
  }).then(data => {
    console.log('useOptimizedNavData fetch data sample:', data?.length ? `Array of ${data.length} items` : typeof data === 'object' ? Object.keys(data) : data)
    return data
  })
}

interface NavProject {
  id: string
  name: string
  slug: string | null
  organizationId: string
  boardLinks?: Array<{
    board: {
      id: string
      name: string
      slug: string | null
      boardType: string | null
    }
  }>
}

interface NavBoard {
  id: string
  name: string
  slug: string | null
  boardType: string | null
  organizationId: string
}

interface NavSprint {
  id: string
  name: string
  goal?: string | null
  status?: string | null
  boardId?: string | null
  projectId?: string | null
}

interface NavOrganizationData {
  id: string
  name: string
  slug: string | null
  projects: NavProject[]
  boards: NavBoard[] // standalone boards
  activeSprints: NavSprint[]
}

export function useOptimizedNavData(organizationId: string | null) {
  // BYPASS React Query for organization endpoint due to cache corruption
  const [organization, setOrganization] = useState<{ id: string; name: string; slug: string | null } | null>(null)
  const [orgError, setOrgError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (!organizationId) return
    
    let isCancelled = false
    
    async function fetchOrganization() {
      try {
        console.log('Direct fetch for organization:', organizationId)
        const response = await fetch(`/api/organizations/${organizationId}`)
        console.log('Direct fetch response:', { status: response.status, ok: response.ok })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch organization: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Direct fetch organization data:', data)
        
        if (!isCancelled) {
          setOrganization(data)
          setOrgError(null)
        }
      } catch (error) {
        console.error('Direct fetch organization error:', error)
        if (!isCancelled) {
          setOrgError(error as Error)
          setOrganization(null)
        }
      }
    }
    
    fetchOrganization()
    
    return () => {
      isCancelled = true
    }
  }, [organizationId])

  const { data: projects = [], error: projectsError } = useQuery<NavProject[]>({
    queryKey: cacheKeys.projects(organizationId || ''),
    queryFn: () => fetcher(`/api/projects?organizationId=${organizationId}`),
    enabled: !!organizationId,
  })

  const { data: allBoards = [], error: boardsError } = useQuery<NavBoard[]>({
    queryKey: cacheKeys.boards(organizationId || ''),
    queryFn: () => fetcher(`/api/boards?organizationId=${organizationId}`),
    enabled: !!organizationId,
  })

  const { data: activeSprints = [], error: sprintsError } = useQuery<NavSprint[]>({
    queryKey: cacheKeys.sprints(undefined, 'active'),
    queryFn: () => fetcher(`/api/sprints?organizationId=${organizationId}&status=active`),
    enabled: !!organizationId,
  })

  // Process data to separate standalone boards from project-linked boards
  const processedData = useMemo(() => {
    if (!organizationId || !organization) return null

    // Get IDs of boards that are linked to projects
    const projectLinkedBoardIds = new Set(
      projects.flatMap(p => p.boardLinks?.map(link => link.board.id) || [])
    )

    // Filter out project-linked boards to get standalone boards
    const standaloneBoards = allBoards.filter(board => 
      !projectLinkedBoardIds.has(board.id)
    )

    return {
      id: organizationId,
      name: organization.name,
      slug: organization.slug,
      projects: projects || [],
      boards: standaloneBoards || [],
      activeSprints: activeSprints || []
    }
  }, [organizationId, organization, projects, allBoards, activeSprints])

  const isLoading = !organizationId || 
    (!organization && !orgError) ||
    (!projects && !projectsError) || 
    (!allBoards && !boardsError) || 
    (!activeSprints && !sprintsError)

  const error = orgError || projectsError || boardsError || sprintsError

  return {
    data: processedData,
    isLoading,
    error
  }
}

// Hook for multiple organizations
export function useOptimizedNavDataMultiple(organizationIds: string[]) {
  console.log('useOptimizedNavDataMultiple called with organizationIds:', organizationIds)
  const results = organizationIds.map(orgId => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useOptimizedNavData(orgId)
  })
  console.log('useOptimizedNavDataMultiple results:', results.map(r => ({ data: r.data?.name, isLoading: r.isLoading, error: r.error })))

  const allData = results.map(result => result.data).filter(Boolean) as NavOrganizationData[]
  const isLoading = results.some(result => result.isLoading)
  const hasError = results.some(result => result.error)

  return {
    data: allData,
    isLoading,
    hasError
  }
}