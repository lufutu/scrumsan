import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// DELETE /api/tasks/[id]/worklog/[entryId] - Delete a worklog entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, entryId } = await params

    // Verify worklog entry exists and user has access
    const worklogEntry = await prisma.taskWorklog.findUnique({
      where: { id: entryId },
      include: {
        task: {
          include: {
            board: {
              select: {
                organizationId: true
              }
            }
          }
        }
      }
    })

    if (!worklogEntry || worklogEntry.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Worklog entry not found' },
        { status: 404 }
      )
    }

    // Check access to organization and ownership
    if (worklogEntry.task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: worklogEntry.task.board.organizationId,
          userId: user.id
        }
      })
      
      if (!orgMember) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Only allow the creator or organization admin to delete
    if (worklogEntry.userId !== user.id) {
      const isAdmin = await prisma.organizationMember.findFirst({
        where: {
          organizationId: worklogEntry.task.board?.organizationId,
          userId: user.id,
          role: 'admin'
        }
      })
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized - you can only delete your own worklog entries' },
          { status: 403 }
        )
      }
    }

    // Store the hours for updating task total
    const hoursToSubtract = worklogEntry.hoursLogged

    // Delete the worklog entry
    await prisma.taskWorklog.delete({
      where: { id: entryId }
    })

    // Update task's logged hours
    const totalLoggedHours = await prisma.taskWorklog.aggregate({
      where: { taskId },
      _sum: { hoursLogged: true }
    })

    await prisma.task.update({
      where: { id: taskId },
      data: {
        loggedHours: totalLoggedHours._sum.hoursLogged || 0
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task worklog:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task worklog' },
      { status: 500 }
    )
  }
}