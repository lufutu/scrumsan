import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const checklistItemUpdateSchema = z.object({
  completed: z.boolean().optional(),
  content: z.string().min(1).max(500).optional()
}).refine(data => data.completed !== undefined || data.content !== undefined, {
  message: "At least one field (completed or content) must be provided"
})

// PATCH /api/tasks/[id]/checklists/[checklistId]/items/[itemId] - Update a checklist item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string; itemId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { checklistId, itemId } = await params
    const body = await req.json()
    
    const validatedData = checklistItemUpdateSchema.parse(body)

    // Verify item exists and user has access
    const item = await prisma.taskChecklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        }
      }
    })

    if (!item || item.checklistId !== checklistId) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      )
    }


    // Check access to organization
    if (item.checklist.task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: item.checklist.task.board.organizationId,
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

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content
    }
    if (validatedData.completed !== undefined) {
      updateData.completed = validatedData.completed
      if (validatedData.completed) {
        updateData.completedAt = new Date()
        updateData.completedBy = user.id
      } else {
        updateData.completedAt = null
        updateData.completedBy = null
      }
    }

    // Update the checklist item
    const updatedItem = await prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: updateData
    })

    return NextResponse.json(updatedItem)
  } catch (error: unknown) {
    console.error('Error updating checklist item:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id]/checklists/[checklistId]/items/[itemId] - Delete a checklist item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string; itemId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, checklistId, itemId } = await params

    // Verify item exists and user has access
    const item = await prisma.taskChecklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
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
        }
      }
    })

    if (!item || item.checklistId !== checklistId || item.checklist.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (item.checklist.task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: item.checklist.task.board.organizationId,
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

    // Delete the checklist item
    await prisma.taskChecklistItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting checklist item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete checklist item' },
      { status: 500 }
    )
  }
}