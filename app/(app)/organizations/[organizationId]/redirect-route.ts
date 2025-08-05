import { NextRequest, NextResponse } from 'next/server'
import { resolveOrganization } from '@/lib/slug-resolver'
import { isUUID } from '@/lib/slug-utils'

/**
 * Redirect handler for UUID-based organization URLs to slug-based URLs
 * This provides backward compatibility
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
  
  // Only handle UUID-based requests
  if (!isUUID(organizationId)) {
    return NextResponse.json(
      { error: 'Invalid organization ID' },
      { status: 400 }
    )
  }
  
  try {
    // Resolve organization by UUID
    const result = await resolveOrganization(organizationId)
    
    if (!result || !result.entity.slug) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    
    // Redirect to slug-based URL
    const redirectUrl = `/orgs/${result.entity.slug}`
    
    return NextResponse.redirect(new URL(redirectUrl, request.url), {
      status: 301 // Permanent redirect
    })
  } catch (error) {
    console.error('Error in redirect handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}