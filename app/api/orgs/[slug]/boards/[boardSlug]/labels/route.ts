import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; boardSlug: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { slug: orgSlug, boardSlug } = await params

    // 1. First resolve organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // 2. Check if user is a member of the organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        userId: user.id
      }
    })
    
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // 3. Get board by organization + slug
    const board = await prisma.board.findUnique({
      where: {
        organizationId_slug: {
          organizationId: organization.id,
          slug: boardSlug
        }
      },
      select: { id: true }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // 4. Get labels for this board (same logic as /api/boards/[boardId]/labels)
    const labels = await prisma.label.findMany({
      where: { boardId: board.id },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(labels)

  } catch (error: unknown) {
    console.error('Error fetching labels:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch labels' },
      { status: 500 }
    )
  }
}