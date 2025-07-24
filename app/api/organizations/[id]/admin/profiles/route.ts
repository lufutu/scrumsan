import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateUUID } from '@/lib/validation-schemas'
import { validatePermission, logAuditEvent } from '@/lib/permission-utils'
import { deleteFileFromS3ByUrl } from '@/lib/aws/s3'
import { z } from 'zod'

// Bulk action schema
const bulkActionSchema = z.object({
  action: z.enum(['reset_avatars', 'update_visibility', 'export_profiles']),
  memberIds: z.array(z.string().uuid()),
  options: z.record(z.any()).optional()
})

/**
 * POST /api/organizations/[id]/admin/profiles
 * Perform bulk operations on member profiles (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: organizationId } = params
    
    // Validate organization ID
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createClient()
    const user = await getCurrentUser(supabase)

    // Validate admin permissions
    const { hasPermission, member, error } = await validatePermission(
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

    // Parse request body
    const body = await req.json()
    const validationResult = bulkActionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { action, memberIds, options } = validationResult.data

    // Validate that all member IDs belong to the organization
    const targetMembers = await prisma.organizationMember.findMany({
      where: {
        id: { in: memberIds },
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

    if (targetMembers.length !== memberIds.length) {
      return NextResponse.json(
        { error: 'Some members not found in organization' },
        { status: 404 }
      )
    }

    let results: any[] = []
    let successCount = 0
    let errorCount = 0

    // Execute bulk action
    switch (action) {
      case 'reset_avatars':
        for (const targetMember of targetMembers) {
          try {
            // Delete avatar from S3 if it exists
            if (targetMember.user.avatarUrl) {
              try {
                await deleteFileFromS3ByUrl(targetMember.user.avatarUrl)
              } catch (deleteError) {
                console.warn(`Failed to delete avatar from S3 for user ${targetMember.user.id}:`, deleteError)
                // Continue with database update even if S3 delete fails
              }
            }

            // Update user avatar URL in database (set to null)
            await prisma.user.update({
              where: { id: targetMember.user.id },
              data: { avatarUrl: null },
            })

            // Log audit event
            await logAuditEvent(
              organizationId,
              user.id,
              'reset_member_avatar',
              'member',
              targetMember.id,
              {
                targetUserId: targetMember.user.id,
                targetUserEmail: targetMember.user.email,
                previousAvatarUrl: targetMember.user.avatarUrl,
              },
              {
                ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
              }
            )

            results.push({
              memberId: targetMember.id,
              success: true,
              message: 'Avatar reset successfully'
            })
            successCount++
          } catch (error) {
            console.error(`Failed to reset avatar for member ${targetMember.id}:`, error)
            results.push({
              memberId: targetMember.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            errorCount++
          }
        }
        break

      case 'update_visibility':
        const visibilitySettings = options?.visibility || {}
        
        for (const targetMember of targetMembers) {
          try {
            // Get or create profile data
            let profileData = await prisma.memberProfile.findUnique({
              where: { organizationMemberId: targetMember.id },
            })

            if (!profileData) {
              profileData = await prisma.memberProfile.create({
                data: {
                  organizationMemberId: targetMember.id,
                  visibility: visibilitySettings,
                },
              })
            } else {
              profileData = await prisma.memberProfile.update({
                where: { id: profileData.id },
                data: { visibility: visibilitySettings },
              })
            }

            // Log audit event
            await logAuditEvent(
              organizationId,
              user.id,
              'update_member_profile_visibility',
              'member',
              targetMember.id,
              {
                targetUserId: targetMember.user.id,
                targetUserEmail: targetMember.user.email,
                visibilitySettings,
              },
              {
                ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
              }
            )

            results.push({
              memberId: targetMember.id,
              success: true,
              message: 'Visibility settings updated'
            })
            successCount++
          } catch (error) {
            console.error(`Failed to update visibility for member ${targetMember.id}:`, error)
            results.push({
              memberId: targetMember.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            errorCount++
          }
        }
        break

      case 'export_profiles':
        // For export, we just return the profile data
        const profilesData = await prisma.memberProfile.findMany({
          where: {
            organizationMemberId: { in: memberIds },
          },
          include: {
            organizationMember: {
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
            },
          },
        })

        // Log audit event for export
        await logAuditEvent(
          organizationId,
          user.id,
          'export_member_profiles',
          'member',
          undefined,
          {
            exportedMemberCount: memberIds.length,
            exportedMemberIds: memberIds,
          },
          {
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
            userAgent: req.headers.get('user-agent') || undefined,
          }
        )

        return NextResponse.json({
          success: true,
          action,
          data: profilesData,
          summary: {
            total: memberIds.length,
            exported: profilesData.length,
          },
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log bulk action completion
    await logAuditEvent(
      organizationId,
      user.id,
      `bulk_${action}`,
      'member',
      undefined,
      {
        memberCount: memberIds.length,
        successCount,
        errorCount,
        results: results.map(r => ({ memberId: r.memberId, success: r.success })),
      },
      {
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    )

    return NextResponse.json({
      success: true,
      action,
      summary: {
        total: memberIds.length,
        successful: successCount,
        failed: errorCount,
      },
      results,
    })
  } catch (error: unknown) {
    console.error('Error in bulk profile operation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/organizations/[id]/admin/profiles
 * Get profile management overview (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: organizationId } = params
    
    // Validate organization ID
    const orgIdValidation = validateUUID(organizationId, 'Organization ID')
    if (!orgIdValidation.valid) {
      return NextResponse.json(
        { error: orgIdValidation.error },
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

    // Get profile statistics
    const [
      totalMembers,
      membersWithAvatars,
      membersWithProfiles,
      recentProfileUpdates
    ] = await Promise.all([
      // Total members count
      prisma.organizationMember.count({
        where: { organizationId },
      }),
      
      // Members with custom avatars
      prisma.organizationMember.count({
        where: {
          organizationId,
          user: {
            avatarUrl: { not: null },
          },
        },
      }),
      
      // Members with profile data
      prisma.memberProfile.count({
        where: {
          organizationMember: {
            organizationId,
          },
        },
      }),
      
      // Recent profile updates (last 30 days)
      prisma.memberProfile.count({
        where: {
          organizationMember: {
            organizationId,
          },
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // Get role distribution
    const roleDistribution = await prisma.organizationMember.groupBy({
      by: ['role'],
      where: { organizationId },
      _count: { role: true },
    })

    return NextResponse.json({
      statistics: {
        totalMembers,
        membersWithAvatars,
        membersWithProfiles,
        recentProfileUpdates,
        avatarCompletionRate: totalMembers > 0 ? (membersWithAvatars / totalMembers) * 100 : 0,
        profileCompletionRate: totalMembers > 0 ? (membersWithProfiles / totalMembers) * 100 : 0,
      },
      roleDistribution: roleDistribution.map(item => ({
        role: item.role,
        count: item._count.role,
      })),
    })
  } catch (error: unknown) {
    console.error('Error fetching profile management overview:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
}