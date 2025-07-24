import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID } from '@/lib/validation-schemas'
import { validatePermission, logAuditEvent } from '@/lib/permission-utils'
import { deleteFileFromS3ByUrl } from '@/lib/aws/s3'

/**
 * POST /api/organizations/[id]/admin/profiles/[memberId]/avatar/reset
 * Reset a member's avatar to generated fallback (admin only)
 */
export async function POST(
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

    // Validate admin permissions
    const { hasPermission, error } = await validatePermission(
      user.id,
      organizationId,
      'teamMembers.manageAll'
    )

    if (!hasPermission || error) {
      return NextResponse.json(
        { error: error || 'Insufficient permissions' },
        { status: 403 }
      )
    }

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

    // Check if user has an avatar to reset
    if (!targetMember.user.avatarUrl) {
      return NextResponse.json(
        { error: 'Member does not have a custom avatar to reset' },
        { status: 400 }
      )
    }

    const previousAvatarUrl = targetMember.user.avatarUrl

    try {
      // Delete avatar from S3
      await deleteFileFromS3ByUrl(targetMember.user.avatarUrl)
    } catch (deleteError) {
      console.warn(`Failed to delete avatar from S3 for user ${targetMember.user.id}:`, deleteError)
      // Continue with database update even if S3 delete fails
    }

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

    // Log audit event
    await logAuditEvent(
      organizationId,
      user.id,
      'admin_reset_member_avatar',
      'member',
      targetMember.id,
      {
        targetUserId: targetMember.user.id,
        targetUserEmail: targetMember.user.email,
        targetUserName: targetMember.user.fullName,
        previousAvatarUrl,
        resetBy: 'admin',
      },
      {
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Avatar reset successfully',
      member: {
        id: targetMember.id,
        user: updatedUser,
      },
    })
  } catch (error: unknown) {
    console.error('Error resetting member avatar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
}