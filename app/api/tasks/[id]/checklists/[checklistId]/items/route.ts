import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { ActivityService } from '@/lib/activity-service'

const checklistItemSchema = z.object({
  content: z.string().min(1).max(500)
})

// POST /api/tasks/[id]/checklists/[checklistId]/items - Add a new checklist item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, checklistId } = await params
    const body = await req.json()
    
    const validatedData = checklistItemSchema.parse(body)

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

    // Create the checklist item
    const item = await prisma.taskChecklistItem.create({
      data: {
        checklistId,
        content: validatedData.content,
        completed: false,
        createdBy: user.id
      }
    })

    // Track checklist item creation activity
    try {
      await ActivityService.createActivity({
        taskId,
        userId: user.id,
        activityType: 'checklist_item_added',
        description: `added checklist item "${validatedData.content}"`
      })
    } catch (activityError) {
      // Don't fail item creation if activity tracking fails
      console.error('Error tracking checklist item activity:', activityError)
    }

    return NextResponse.json(item)
  } catch (error: unknown) {
    console.error('Error creating checklist item:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checklist item' },
      { status: 500 }
    )
  }
}