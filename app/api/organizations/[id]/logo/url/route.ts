import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getSignedUrlForS3File } from '@/lib/aws/s3'

// GET /api/organizations/[id]/logo/url - Get signed URL for organization logo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: organizationId } = await params

    // Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: user.id
      }
    })

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get organization to check if it has a logo
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { logo: true }
    })

    if (!organization || !organization.logo) {
      return NextResponse.json(
        { error: 'No logo found' },
        { status: 404 }
      )
    }

    // Generate signed URL for the logo
    const key = `organizations/${organizationId}/logos/${organization.logo}`
    const signedUrl = await getSignedUrlForS3File(key, 3600) // 1 hour expiry
    
    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600
    })

  } catch (error: unknown) {
    console.error('Error generating logo signed URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate logo URL' },
      { status: 500 }
    )
  }
}