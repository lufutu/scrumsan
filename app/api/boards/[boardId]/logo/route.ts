import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { uploadBoardLogoToS3, deleteFileFromS3ByUrl } from '@/lib/aws/s3'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = await params

    // Check if user has access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organizationId: {
          in: await prisma.organization.findMany({
            where: {
              members: {
                some: {
                  userId: user.id
                }
              }
            },
            select: { id: true }
          }).then(orgs => orgs.map(org => org.id))
        }
      }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    // Get the uploaded file
    const formData = await req.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Delete existing logo if it exists
    if (board.logo) {
      try {
        await deleteFileFromS3ByUrl(board.logo)
      } catch (error) {
        console.warn('Failed to delete existing logo:', error)
        // Continue with upload even if deletion fails
      }
    }

    // Upload to S3
    const uploadResult = await uploadBoardLogoToS3(boardId, file)

    // Update board with logo filename (not full URL)
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { logo: uploadResult.filename }
    })

    return NextResponse.json({ 
      success: true,
      filename: uploadResult.filename,
      url: uploadResult.url
    })
  } catch (error: unknown) {
    console.error('Error uploading board logo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = await params

    // Check if user has access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        organizationId: {
          in: await prisma.organization.findMany({
            where: {
              members: {
                some: {
                  userId: user.id
                }
              }
            },
            select: { id: true }
          }).then(orgs => orgs.map(org => org.id))
        }
      }
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    // Delete from S3 if logo exists
    if (board.logo) {
      try {
        // Construct logo URL and delete it
        const region = process.env.AWS_REGION || 'ap-southeast-1'
        const bucket = process.env.AWS_S3_BUCKET || 'scrumsan'
        const logoUrl = `https://${bucket}.s3.${region}.amazonaws.com/boards/${boardId}/logos/${board.logo}`
        await deleteFileFromS3ByUrl(logoUrl)
      } catch (error) {
        console.warn('Failed to delete logo from S3:', error)
        // Continue with database update even if S3 deletion fails
      }
    }

    // Update board to remove logo
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { logo: null }
    })

    return NextResponse.json({ 
      message: 'Logo removed successfully',
      board: updatedBoard 
    })
  } catch (error: unknown) {
    console.error('Error removing board logo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove logo' },
      { status: 500 }
    )
  }
}