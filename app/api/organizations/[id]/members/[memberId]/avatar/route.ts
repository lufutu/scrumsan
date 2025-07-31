import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID } from '@/lib/validation-schemas'
import { uploadAvatarToS3, deleteFileFromS3ByUrl } from '@/lib/aws/s3'

// Helper function to check organization permissions
async function checkOrganizationPermission(
  organizationId: string, 
  userId: string, 
  requiredRole: 'owner' | 'admin' | 'member' = 'member'
) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: {
      permissionSet: true,
    },
  })

  if (!member) {
    throw new Error('Access denied: Not a member of this organization')
  }

  // Check role hierarchy: owner > admin > member
  const roleHierarchy = { owner: 3, admin: 2, member: 1 }
  const userRoleLevel = roleHierarchy[member.role as keyof typeof roleHierarchy] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole]

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(`Access denied: ${requiredRole} role required`)
  }

  return member
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId  } = await params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const memberIdValidation = validateUUID(memberId, 'Member ID')
    if (!memberIdValidation.valid) {
      return NextResponse.json(
        { error: memberIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'member')

    // Get the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        id: memberId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if current user can edit this profile
    const isOwnProfile = targetMember.user.id === user.id
    const canEditProfile = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      isOwnProfile

    if (!canEditProfile) {
      return NextResponse.json(
        { error: 'Access denied: Cannot edit this profile' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    const maxSizeInBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    try {
      // Delete old avatar if it exists
      if (targetMember.user.avatarUrl) {
        try {
          await deleteFileFromS3ByUrl(targetMember.user.avatarUrl)
        } catch (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError)
          // Continue with upload even if delete fails
        }
      }

      // Upload new avatar
      const uploadResult = await uploadAvatarToS3(targetMember.user.id, file)

      // Update user avatar URL in database
      const updatedUser = await prisma.user.update({
        where: {
          id: targetMember.user.id,
        },
        data: {
          avatarUrl: uploadResult.url,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      })

      return NextResponse.json({
        success: true,
        user: updatedUser,
        avatar: {
          url: uploadResult.url,
          filename: uploadResult.filename,
          size: file.size,
          type: file.type,
        },
      })
    } catch (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'Failed to upload avatar' },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Error in avatar upload:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: organizationId, memberId  } = await params
    
    // Validate IDs
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    const memberIdValidation = validateUUID(memberId, 'Member ID')
    if (!memberIdValidation.valid) {
      return NextResponse.json(
        { error: memberIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Check permissions
    const currentMember = await checkOrganizationPermission(organizationId, user.id, 'member')

    // Get the target member
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        id: memberId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if current user can edit this profile
    const isOwnProfile = targetMember.user.id === user.id
    const canEditProfile = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      isOwnProfile

    if (!canEditProfile) {
      return NextResponse.json(
        { error: 'Access denied: Cannot edit this profile' },
        { status: 403 }
      )
    }

    // Check if user has an avatar to delete
    if (!targetMember.user.avatarUrl) {
      return NextResponse.json(
        { error: 'No avatar to delete' },
        { status: 400 }
      )
    }

    try {
      // Delete avatar from S3
      await deleteFileFromS3ByUrl(targetMember.user.avatarUrl)

      // Update user avatar URL in database (set to null)
      const updatedUser = await prisma.user.update({
        where: {
          id: targetMember.user.id,
        },
        data: {
          avatarUrl: null,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      })

      return NextResponse.json({
        success: true,
        user: updatedUser,
        message: 'Avatar deleted successfully',
      })
    } catch (deleteError) {
      console.error('Error deleting avatar:', deleteError)
      return NextResponse.json(
        { error: deleteError instanceof Error ? deleteError.message : 'Failed to delete avatar' },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Error in avatar deletion:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}