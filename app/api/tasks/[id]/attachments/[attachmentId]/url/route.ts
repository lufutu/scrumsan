import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { getSignedUrlForS3File } from '@/lib/aws/s3'

// GET /api/tasks/[id]/attachments/[attachmentId]/url - Get signed URL for task attachment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId, attachmentId } = await params

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          select: {
            organizationId: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check access to organization
    if (task.board?.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: task.board.organizationId,
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

    // Get the attachment
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId
      }
    })

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Extract S3 key from the attachment URL
    const bucket = process.env.AWS_S3_BUCKET!
    const region = process.env.AWS_REGION!
    
    // Parse the S3 URL to get the key
    let s3Key: string
    try {
      const urlObj = new URL(attachment.url)
      if (urlObj.hostname.includes('s3.amazonaws.com')) {
        // Format: https://bucket.s3.region.amazonaws.com/path/file.jpg
        s3Key = urlObj.pathname.substring(1) // Remove leading slash
      } else {
        throw new Error('Invalid S3 URL format')
      }
    } catch (error) {
      console.error('Error parsing attachment URL:', error)
      return NextResponse.json(
        { error: 'Invalid attachment URL' },
        { status: 400 }
      )
    }

    // Generate signed URL for the attachment
    const signedUrl = await getSignedUrlForS3File(s3Key, 3600) // 1 hour expiry
    
    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600,
      filename: attachment.name,
      size: attachment.size,
      type: attachment.type
    })

  } catch (error: unknown) {
    console.error('Error generating attachment signed URL:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate attachment URL' },
      { status: 500 }
    )
  }
}