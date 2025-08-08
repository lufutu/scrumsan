import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { cacheKeys } from '@/lib/query-optimization'
import { useOrganization } from '@/providers/organization-provider'

// Generic fetcher function for API requests
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
})

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
      logo: string | null
    }
  }>
}

interface NavBoard {
  id: string
  name: string
  slug: string | null
  boardType: string | null
  logo: string | null
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
  logo: string | null
  projects: NavProject[]
  boards: NavBoard[] // standalone boards
  activeSprints: NavSprint[]
}

export function useOptimizedNavData(organizationId: string | null) {
  // Get organization data from the organization provider instead of making API calls
  const { organizations } = useOrganization()
  
  // Find the organization data from the provider context
  const organization = useMemo(() => {
    if (!organizationId || !organizations?.length) return null
    return organizations.find(org => org.id === organizationId) || null
  }, [organizationId, organizations])

  const { data: projects = [], error: projectsError } = useQuery<NavProject[]>({
    queryKey: cacheKeys.projects(organizationId || ''),
    queryFn: () => fetcher(`/api/projects?organizationId=${organizationId}`),
    enabled: !!organizationId,
  })

  const { data: boardsResponse = { boards: [] }, error: boardsError } = useQuery<{ boards: NavBoard[] }>({
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
    const standaloneBoards = (boardsResponse?.boards || []).filter(board => 
      !projectLinkedBoardIds.has(board.id)
    )

    return {
      id: organizationId,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      projects: projects || [],
      boards: standaloneBoards || [],
      activeSprints: activeSprints || []
    }
  }, [organizationId, organization, projects, boardsResponse, activeSprints])

  const isLoading = !organizationId || 
    (!projects && !projectsError) || 
    (!boardsResponse && !boardsError) || 
    (!activeSprints && !sprintsError)

  const error = projectsError || boardsError || sprintsError

  return {
    data: processedData,
    isLoading,
    error
  }
}

// Hook for multiple organizations
export function useOptimizedNavDataMultiple(organizationIds: string[]) {
  const results = organizationIds.map(orgId => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useOptimizedNavData(orgId)
  })

  const allData = results.map(result => result.data).filter(Boolean) as NavOrganizationData[]
  const isLoading = results.some(result => result.isLoading)
  const hasError = results.some(result => result.error)

  return {
    data: allData,
    isLoading,
    hasError
  }
}