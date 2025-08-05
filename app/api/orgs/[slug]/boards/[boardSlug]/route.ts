import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveOrganization, resolveBoard } from '@/lib/slug-resolver'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; boardSlug: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    const { slug: orgSlug, boardSlug } = await params

    // First resolve the organization
    const orgResult = await resolveOrganization(orgSlug)
    if (!orgResult) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const organization = orgResult.entity

    // Check if user is a member of the organization
    const { prisma } = await import('@/lib/prisma')
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

    // Resolve the board within the organization
    const boardResult = await resolveBoard(boardSlug, organization.id, {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      columns: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          position: true
        }
      },
      _count: {
        select: {
          tasks: true,
          columns: true
        }
      }
    })

    if (!boardResult) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(boardResult.entity)

  } catch (error: unknown) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}