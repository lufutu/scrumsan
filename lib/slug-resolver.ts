/**
 * Slug resolver utilities for API routes
 * Handles dual resolution of slugs and UUIDs for backward compatibility
 */

import { PrismaClient } from '@prisma/client'
import { isUUID } from './slug-utils'

const prisma = new PrismaClient()

export type EntityType = 'organization' | 'project' | 'board' | 'sprint'

export interface ResolvedEntity<T = any> {
  entity: T
  resolvedBy: 'slug' | 'uuid'
}

/**
 * Resolve an organization by slug or UUID
 */
export async function resolveOrganization(
  identifier: string,
  include?: any
): Promise<ResolvedEntity<any> | null> {
  const isId = isUUID(identifier)
  
  const whereClause = isId 
    ? { id: identifier }
    : { slug: identifier }
  
  const organization = await prisma.organization.findUnique({
    where: whereClause,
    include
  })
  
  if (!organization) {
    return null
  }
  
  return {
    entity: organization,
    resolvedBy: isId ? 'uuid' : 'slug'
  }
}

/**
 * Resolve a project by slug or UUID within an organization
 */
export async function resolveProject(
  identifier: string,
  organizationId: string,
  include?: any
): Promise<ResolvedEntity<any> | null> {
  const isId = isUUID(identifier)
  
  let whereClause: any
  
  if (isId) {
    // If it's a UUID, we can search directly by ID
    whereClause = { 
      id: identifier,
      organizationId // Still verify it belongs to the org
    }
  } else {
    // If it's a slug, search within the organization
    whereClause = { 
      slug: identifier,
      organizationId
    }
  }
  
  const project = await prisma.project.findUnique({
    where: whereClause,
    include
  })
  
  if (!project) {
    return null
  }
  
  return {
    entity: project,
    resolvedBy: isId ? 'uuid' : 'slug'
  }
}

/**
 * Resolve a board by slug or UUID within an organization
 */
export async function resolveBoard(
  identifier: string,
  organizationId: string,
  include?: any
): Promise<ResolvedEntity<any> | null> {
  const isId = isUUID(identifier)
  
  let whereClause: any
  
  if (isId) {
    // If it's a UUID, we can search directly by ID
    whereClause = { 
      id: identifier,
      organizationId // Still verify it belongs to the org
    }
  } else {
    // If it's a slug, search within the organization
    whereClause = { 
      slug: identifier,
      organizationId
    }
  }
  
  const board = await prisma.board.findUnique({
    where: whereClause,
    include
  })
  
  if (!board) {
    return null
  }
  
  return {
    entity: board,
    resolvedBy: isId ? 'uuid' : 'slug'
  }
}

/**
 * Resolve a sprint by slug or UUID within a board
 */
export async function resolveSprint(
  identifier: string,
  boardId: string,
  include?: any
): Promise<ResolvedEntity<any> | null> {
  const isId = isUUID(identifier)
  
  let whereClause: any
  
  if (isId) {
    // If it's a UUID, we can search directly by ID
    whereClause = { 
      id: identifier,
      boardId // Still verify it belongs to the board
    }
  } else {
    // If it's a slug, search within the board
    whereClause = { 
      slug: identifier,
      boardId
    }
  }
  
  const sprint = await prisma.sprint.findUnique({
    where: whereClause,
    include
  })
  
  if (!sprint) {
    return null
  }
  
  return {
    entity: sprint,
    resolvedBy: isId ? 'uuid' : 'slug'
  }
}

/**
 * Generic entity resolver
 */
export async function resolveEntity(
  type: EntityType,
  identifier: string,
  parentId?: string,
  include?: any
): Promise<ResolvedEntity<any> | null> {
  switch (type) {
    case 'organization':
      return resolveOrganization(identifier, include)
    
    case 'project':
      if (!parentId) {
        throw new Error('Organization ID is required for project resolution')
      }
      return resolveProject(identifier, parentId, include)
    
    case 'board':
      if (!parentId) {
        throw new Error('Organization ID is required for board resolution')
      }
      return resolveBoard(identifier, parentId, include)
    
    case 'sprint':
      if (!parentId) {
        throw new Error('Board ID is required for sprint resolution')
      }
      return resolveSprint(identifier, parentId, include)
    
    default:
      throw new Error(`Unknown entity type: ${type}`)
  }
}

/**
 * Build a slug-based URL for an entity
 */
export function buildSlugUrl(
  organizationSlug: string,
  entityType?: EntityType,
  entitySlug?: string,
  subPath?: string
): string {
  let url = `/orgs/${organizationSlug}`
  
  if (entityType && entitySlug) {
    switch (entityType) {
      case 'project':
        url += `/projects/${entitySlug}`
        break
      case 'board':
        url += `/boards/${entitySlug}`
        break
      case 'sprint':
        // Sprints are nested under boards, so we need board info too
        // This might need to be handled differently based on the context
        url += `/sprints/${entitySlug}`
        break
    }
  }
  
  if (subPath) {
    url += `/${subPath}`
  }
  
  return url
}

/**
 * Generate a redirect response for UUID to slug URLs
 */
export function createSlugRedirect(
  organizationSlug: string,
  entityType?: EntityType,
  entitySlug?: string,
  subPath?: string
): Response {
  const redirectUrl = buildSlugUrl(organizationSlug, entityType, entitySlug, subPath)
  
  return new Response(null, {
    status: 301, // Permanent redirect
    headers: {
      'Location': redirectUrl,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  })
}

/**
 * Middleware helper to resolve entity from request params
 */
export type EntityResolutionResult<T = any> = {
  success: true
  entity: T
  resolvedBy: 'slug' | 'uuid'
  shouldRedirect: boolean
  redirectUrl?: string
} | {
  success: false
  error: string
  status: number // HTTP status code
}

export async function resolveEntityFromParams(
  type: EntityType,
  identifier: string,
  parentId?: string,
  include?: any,
  generateRedirect: boolean = false
): Promise<EntityResolutionResult> {
  try {
    const result = await resolveEntity(type, identifier, parentId, include)
    
    if (!result) {
      return {
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
        status: 404
      }
    }
    
    // Check if we should redirect from UUID to slug
    const shouldRedirect = generateRedirect && 
      result.resolvedBy === 'uuid' && 
      result.entity.slug
    
    let redirectUrl: string | undefined
    if (shouldRedirect) {
      // We'd need more context to build the full redirect URL
      // This is a placeholder - actual implementation would depend on the specific route
      redirectUrl = result.entity.slug
    }
    
    return {
      success: true,
      entity: result.entity,
      resolvedBy: result.resolvedBy,
      shouldRedirect,
      redirectUrl
    }
  } catch (error) {
    console.error(`Error resolving ${type}:`, error)
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    }
  }
}

/**
 * Helper to get entity URL paths for different entities
 */
export function getEntityPaths(entity: any, type: EntityType): {
  slugPath: string
  uuidPath: string
} {
  const id = entity.id
  const slug = entity.slug
  
  switch (type) {
    case 'organization':
      return {
        slugPath: `/orgs/${slug}`,
        uuidPath: `/organizations/${id}`
      }
    case 'project':
      // Would need organization context
      return {
        slugPath: `/orgs/${entity.organization?.slug}/projects/${slug}`,
        uuidPath: `/projects/${id}`
      }
    case 'board':
      // Would need organization context
      return {
        slugPath: `/orgs/${entity.organization?.slug}/boards/${slug}`,
        uuidPath: `/boards/${id}`
      }
    case 'sprint':
      // Would need board and organization context
      return {
        slugPath: `/orgs/${entity.board?.organization?.slug}/boards/${entity.board?.slug}/sprints/${slug}`,
        uuidPath: `/sprints/${id}`
      }
    default:
      throw new Error(`Unknown entity type: ${type}`)
  }
}