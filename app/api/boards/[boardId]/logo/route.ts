import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = params

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

    // Upload to Supabase Storage
    const fileName = `board-logos/${boardId}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)

    // Update board with logo URL
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { logo: publicUrl }
    })

    return NextResponse.json({ 
      logo: publicUrl,
      board: updatedBoard 
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
  { params }: { params: { boardId: string } }
) {
  try {
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)
    const { boardId } = params

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

    // Delete from storage if logo exists
    if (board.logo) {
      const path = board.logo.split('/').slice(-3).join('/')
      await supabase.storage
        .from('avatars')
        .remove([path])
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