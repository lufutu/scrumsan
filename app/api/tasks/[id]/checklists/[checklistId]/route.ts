import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

// DELETE /api/tasks/[id]/checklists/[checklistId] - Delete a checklist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, checklistId } = await params

    // Verify checklist exists and user has access
    const checklist = await prisma.taskChecklist.findUnique({
      where: { id: checklistId },
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

    if (!checklist || checklist.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (checklist.task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: checklist.task.board.organizationId,
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

    // Delete the checklist (this will cascade delete all items)
    await prisma.taskChecklist.delete({
      where: { id: checklistId }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task checklist:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task checklist' },
      { status: 500 }
    )
  }
}