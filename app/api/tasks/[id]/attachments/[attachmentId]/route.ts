import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { deleteFileFromS3ByUrl } from '@/lib/aws/s3'

// DELETE /api/tasks/[id]/attachments/[attachmentId] - Delete an attachment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, attachmentId } = await params

    // Verify attachment exists and user has access
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
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

    if (!attachment || attachment.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (attachment.task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: attachment.task.board.organizationId,
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

    try {
      // Delete file from S3
      await deleteFileFromS3ByUrl(attachment.url)
    } catch (storageError) {
      console.error('Error deleting file from S3:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the attachment record
    await prisma.attachment.delete({
      where: { id: attachmentId }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task attachment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task attachment' },
      { status: 500 }
    )
  }
}