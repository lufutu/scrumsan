import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { uploadTaskAttachmentToS3, getSignedUrlForS3File, extractS3KeyFromUrl } from '@/lib/aws/s3'

// GET /api/tasks/[id]/attachments - Get all attachments for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params

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

    // Get all attachments for this task
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    })

    // For new uploads, just return attachments as is since we're returning signed URLs from upload
    // For existing attachments, try to generate signed URLs
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          // If URL already looks like a signed URL (has query params), return as is
          if (attachment.url.includes('?')) {
            return attachment;
          }
          
          console.log('[DEBUG] Processing attachment:', attachment.id, 'URL:', attachment.url);
          const s3Key = extractS3KeyFromUrl(attachment.url)
          console.log('[DEBUG] Using S3 key for signed URL:', s3Key);
          
          try {
            const signedUrl = await getSignedUrlForS3File(s3Key, 3600) // 1 hour expiry
            return {
              ...attachment,
              url: signedUrl
            }
          } catch (signedUrlError) {
            // If signed URL generation fails, mark as unavailable
            console.warn(`Attachment ${attachment.id} not found in S3`);
            return {
              ...attachment,
              url: null, // Mark as unavailable
              error: 'File not found'
            }
          }
        } catch (error) {
          console.error(`Error processing attachment ${attachment.id}:`, error)
          return {
            ...attachment,
            url: null,
            error: 'Processing error'
          }
        }
      })
    )

    return NextResponse.json(attachmentsWithUrls)
  } catch (error: unknown) {
    console.error('Error fetching task attachments:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task attachments' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[id]/attachments - Upload new attachments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { id: taskId } = await params

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

    // Parse the form data
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Upload files and create attachment records
    const attachments = []
    for (const file of files) {
      try {
        // Upload file to S3
        const { url, key } = await uploadTaskAttachmentToS3(taskId, file)
        
        // Create attachment record
        const attachment = await prisma.attachment.create({
          data: {
            taskId,
            name: file.name,
            url,
            size: file.size,
            type: file.type || 'application/octet-stream',
            uploadedBy: user.id
          },
          include: {
            uploadedByUser: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        })
        
        // Generate signed URL for the newly uploaded file
        try {
          const signedUrl = await getSignedUrlForS3File(key, 3600) // 1 hour expiry
          attachments.push({
            ...attachment,
            url: signedUrl
          })
        } catch (error) {
          console.error('Error generating signed URL for new upload:', error)
          attachments.push(attachment) // Fallback to original URL
        }
      } catch (fileError) {
        console.error(`Error uploading file ${file.name}:`, fileError)
        // Continue with other files even if one fails
      }
    }

    if (attachments.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any files' },
        { status: 500 }
      )
    }

    return NextResponse.json(attachments)
  } catch (error: unknown) {
    console.error('Error uploading task attachments:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload task attachments' },
      { status: 500 }
    )
  }
}