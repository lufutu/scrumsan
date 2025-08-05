import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { isUUID } from '@/lib/slug-utils'

const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/auth/verify-email']
const protectedRoutes = ['/dashboard', '/projects', '/organizations', '/settings', '/profile']

/**
 * Handle UUID to slug redirects for backward compatibility
 */
async function handleUuidToSlugRedirect(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  try {
    // Check for organization UUID redirects
    const orgMatch = pathname.match(/^\/organizations\/([^\/]+)(.*)$/)
    if (orgMatch) {
      const [, orgId, subPath] = orgMatch
      if (isUUID(orgId)) {
        // This is a UUID, try to redirect to slug
        const response = await fetch(new URL(`/api/organizations/${orgId}`, request.url))
        if (response.ok) {
          const org = await response.json()
          if (org.slug) {
            const newPath = `/orgs/${org.slug}${subPath}`
            return NextResponse.redirect(new URL(newPath, request.url), { status: 301 })
          }
        }
      }
    }

    // Check for project UUID redirects
    const projectMatch = pathname.match(/^\/projects\/([^\/]+)(.*)$/)
    if (projectMatch) {
      const [, projectId, subPath] = projectMatch
      if (isUUID(projectId)) {
        // This is a UUID, try to redirect to slug
        const response = await fetch(new URL(`/api/projects/${projectId}`, request.url))
        if (response.ok) {
          const project = await response.json()
          if (project.slug && project.organization?.slug) {
            const newPath = `/orgs/${project.organization.slug}/projects/${project.slug}${subPath}`
            return NextResponse.redirect(new URL(newPath, request.url), { status: 301 })
          }
        }
      }
    }

    // Check for board UUID redirects
    const boardMatch = pathname.match(/^\/boards\/([^\/]+)(.*)$/)
    if (boardMatch) {
      const [, boardId, subPath] = boardMatch
      if (isUUID(boardId)) {
        // This is a UUID, try to redirect to slug
        const response = await fetch(new URL(`/api/boards/${boardId}`, request.url))
        if (response.ok) {
          const board = await response.json()
          if (board.slug && board.organization?.slug) {
            const newPath = `/orgs/${board.organization.slug}/boards/${board.slug}${subPath}`
            return NextResponse.redirect(new URL(newPath, request.url), { status: 301 })
          }
        }
      }
    }

    // Check for sprint UUID redirects
    const sprintMatch = pathname.match(/^\/sprints\/([^\/]+)(.*)$/)
    if (sprintMatch) {
      const [, sprintId, subPath] = sprintMatch
      if (isUUID(sprintId)) {
        // This is a UUID, try to redirect to slug
        const response = await fetch(new URL(`/api/sprints/${sprintId}`, request.url))
        if (response.ok) {
          const sprint = await response.json()
          if (sprint.slug && sprint.board?.slug && sprint.board?.organization?.slug) {
            const newPath = `/orgs/${sprint.board.organization.slug}/boards/${sprint.board.slug}/sprints/${sprint.slug}${subPath}`
            return NextResponse.redirect(new URL(newPath, request.url), { status: 301 })
          }
        }
      }
    }
  } catch (error) {
    // Silent fail for redirect attempts - if they fail, continue with normal flow
    console.warn('Failed to process UUID redirect:', error)
  }

  return null
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Handle UUID to slug redirects for backward compatibility
  const uuidRedirectResult = await handleUuidToSlugRedirect(request, pathname)
  if (uuidRedirectResult) {
    return uuidRedirectResult
  }

  // Check if the current path requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.includes(pathname)

  // If user is not signed in and trying to access protected routes
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is signed in and trying to access auth pages, redirect to home
  if (user && ['/login', '/signup'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 