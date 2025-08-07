import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getSignedUrlForS3File } from '@/lib/aws/s3'

// GET /api/boards/[boardId]/logo/url - Get signed URL for board logo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = await params

    // Check if user has access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organizationId: {
          in: await prisma.organization.findMany({
            where: {
              members: {
                some: {
                  userId: user.id
                }
              }
            },
            select: { id: true }
          }).then(orgs => orgs.map(org => org.id))
        }
      },
      select: { logo: true }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    if (!board.logo) {
      return NextResponse.json(
        { error: 'No logo found' },
        { status: 404 }
      )
    }

    // Generate signed URL for the logo
    const key = `boards/${boardId}/logos/${board.logo}`
    const signedUrl = await getSignedUrlForS3File(key, 3600) // 1 hour expiry
    
    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600
    })

  } catch (error: unknown) {
    console.error('Error generating board logo signed URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate logo URL' },
      { status: 500 }
    )
  }
}