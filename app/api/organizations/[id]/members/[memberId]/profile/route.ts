import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { validateUUID, memberProfileUpdateSchema } from '@/lib/validation-schemas'
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

// Helper function to apply visibility filters to profile data
function applyVisibilityFilters(
  profileData: Record<string, unknown> | null,
  currentUserRole: string,
  isOwnProfile: boolean
): Record<string, unknown> | null {
  if (!profileData || isOwnProfile) {
    return profileData
  }

  const visibility = profileData.visibility as Record<string, string> || {}
  const filteredProfile = { ...profileData }

  // Apply visibility filters for each field
  const profileFields = [
    'secondaryEmail', 'address', 'phone', 'linkedin', 'skype', 
    'twitter', 'birthday', 'maritalStatus', 'family', 'other'
  ]

  profileFields.forEach(field => {
    const fieldVisibility = visibility[field] || 'admin'
    if (fieldVisibility === 'admin' && currentUserRole === 'member') {
      delete filteredProfile[field]
    }
  })

  return filteredProfile
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { id: organizationId, memberId } = params
    
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

    // Check permissions - member level required to view profiles
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
        profileData: true,
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if current user can view this profile
    const isOwnProfile = targetMember.user.id === user.id
    const canViewProfile = 
      currentMember.role === 'owner' || 
      currentMember.role === 'admin' || 
      isOwnProfile

    if (!canViewProfile) {
      return NextResponse.json(
        { error: 'Access denied: Cannot view this profile' },
        { status: 403 }
      )
    }

    // Get or create profile data
    let profileData = targetMember.profileData
    if (!profileData) {
      // Create empty profile if it doesn't exist
      profileData = await prisma.memberProfile.create({
        data: {
          organizationMemberId: memberId,
          visibility: {},
        },
      })
    }

    // Apply visibility filters
    const filteredProfile = applyVisibilityFilters(
      profileData,
      currentMember.role,
      isOwnProfile
    )

    return NextResponse.json({
      id: targetMember.id,
      user: targetMember.user,
      profile: filteredProfile,
    })
  } catch (error: unknown) {
    console.error('Error fetching member profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { id: organizationId, memberId } = params
    
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

    // Check if request contains multipart form data (for avatar upload)
    const contentType = req.headers.get('content-type') || ''
    let updateData: any
    let avatarFile: File | null = null
    let avatarAction: string | null = null

    if (contentType.includes('multipart/form-data')) {
      // Handle form data with potential file upload
      const formData = await req.formData()
      
      // Extract profile data from form
      const profileDataStr = formData.get('profileData') as string
      if (profileDataStr) {
        try {
          updateData = JSON.parse(profileDataStr)
        } catch {
          return NextResponse.json(
            { error: 'Invalid profile data format' },
            { status: 400 }
          )
        }
      } else {
        updateData = {}
      }

      // Extract avatar data
      avatarAction = formData.get('avatarAction') as string
      avatarFile = formData.get('avatarFile') as File

      // Validate avatar file if provided
      if (avatarFile && avatarFile.size > 0) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(avatarFile.type)) {
          return NextResponse.json(
            { error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` },
            { status: 400 }
          )
        }

        const maxSizeInBytes = 5 * 1024 * 1024 // 5MB
        if (avatarFile.size > maxSizeInBytes) {
          return NextResponse.json(
            { error: `File size exceeds 5MB limit. Current size: ${(avatarFile.size / 1024 / 1024).toFixed(2)}MB` },
            { status: 400 }
          )
        }
      }
    } else {
      // Handle JSON request body
      const body = await req.json()
      updateData = body
      avatarAction = body.avatarAction
    }

    // Validate profile data
    const validationResult = memberProfileUpdateSchema.safeParse(updateData)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const validatedUpdateData = validationResult.data

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
        profileData: true,
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

    // Handle avatar changes
    let updatedUser = targetMember.user
    if (avatarAction) {
      try {
        if (avatarAction === 'upload' && avatarFile) {
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
          const uploadResult = await uploadAvatarToS3(targetMember.user.id, avatarFile)

          // Update user avatar URL in database
          updatedUser = await prisma.user.update({
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
        } else if (avatarAction === 'delete') {
          // Delete avatar
          if (targetMember.user.avatarUrl) {
            try {
              await deleteFileFromS3ByUrl(targetMember.user.avatarUrl)
            } catch (deleteError) {
              console.warn('Failed to delete avatar from S3:', deleteError)
              // Continue with database update even if S3 delete fails
            }
          }

          // Update user avatar URL in database (set to null)
          updatedUser = await prisma.user.update({
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
        }
        // If avatarAction is 'keep', do nothing with avatar
      } catch (avatarError) {
        console.error('Error handling avatar:', avatarError)
        return NextResponse.json(
          { error: avatarError instanceof Error ? avatarError.message : 'Failed to handle avatar' },
          { status: 500 }
        )
      }
    }

    // Prepare profile update data, converting date strings to Date objects
    const dataToUpdate: Record<string, unknown> = {}
    
    Object.keys(validatedUpdateData).forEach(key => {
      const value = validatedUpdateData[key as keyof typeof validatedUpdateData]
      if (key === 'birthday' && value) {
        dataToUpdate[key] = new Date(value as string)
      } else if (key === 'visibility') {
        dataToUpdate[key] = value || {}
      } else {
        dataToUpdate[key] = value
      }
    })

    // Update or create profile
    let updatedProfile
    if (targetMember.profileData) {
      updatedProfile = await prisma.memberProfile.update({
        where: {
          id: targetMember.profileData.id,
        },
        data: dataToUpdate,
      })
    } else {
      updatedProfile = await prisma.memberProfile.create({
        data: {
          organizationMemberId: memberId,
          ...dataToUpdate,
        },
      })
    }

    // Apply visibility filters for response
    const filteredProfile = applyVisibilityFilters(
      updatedProfile,
      currentMember.role,
      isOwnProfile
    )

    return NextResponse.json({
      id: targetMember.id,
      user: updatedUser,
      profile: filteredProfile,
    })
  } catch (error: unknown) {
    console.error('Error updating member profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}