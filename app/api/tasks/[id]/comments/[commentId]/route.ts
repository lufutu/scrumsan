import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const commentUpdateSchema = z.object({
  content: z.string().min(1).max(10000)
})

// PATCH /api/tasks/[id]/comments/[commentId] - Update a comment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, commentId } = await params
    const body = await req.json()
    
    const validatedData = commentUpdateSchema.parse(body)

    // Verify comment exists and user is the author
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment || comment.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    if (comment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only edit your own comments' },
        { status: 403 }
      )
    }

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: validatedData.content,
              },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedComment)
  } catch (error: unknown) {
    console.error('Error updating task comment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task comment' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, commentId } = await params

    // Verify comment exists and user is the author
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment || comment.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    if (comment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only delete your own comments' },
        { status: 403 }
      )
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task comment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task comment' },
      { status: 500 }
    )
  }
}