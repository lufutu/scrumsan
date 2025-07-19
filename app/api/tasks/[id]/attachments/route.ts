import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { uploadTaskAttachmentToS3 } from '@/lib/aws/s3'

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

    return NextResponse.json(attachments)
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
        const { url } = await uploadTaskAttachmentToS3(taskId, file)
        
        // Create attachment record
        const attachment = await prisma.attachment.create({
          data: {
            taskId,
            name: file.name,
            url,
            size: file.size,
            type: file.type,
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
        
        attachments.push(attachment)
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