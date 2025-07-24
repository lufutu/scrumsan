import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendInvitationEmail } from '@/lib/email-utils'
import { generateSecureToken } from '@/lib/crypto-utils'

/**
 * POST /api/organizations/[id]/invitations/[invitationId]/resend
 * Resend a pending invitation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    console.log('🔄 Resend invitation API called')
    const { id: organizationId, invitationId } = await params
    console.log('📝 Params:', { organizationId, invitationId })

    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            fullName: true,
            email: true,
          },
        },
        permissionSet: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invitation) {
      console.log('❌ Invitation not found')
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (invitation.organizationId !== organizationId) {
      console.log('❌ Invitation does not belong to this organization')
      return NextResponse.json(
        { error: 'Invitation does not belong to this organization' },
        { status: 403 }
      )
    }

    if (invitation.acceptedAt) {
      console.log('❌ Invitation has already been accepted')
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Generate new token and extend expiry
    const newToken = generateSecureToken()
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

    console.log('🔄 Updating invitation with new token')

    // Update the invitation with new token and expiry
    const updatedInvitation = await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    })

    console.log('📧 Sending invitation email')

    // Send the invitation email with new token
    try {
      await sendInvitationEmail({
        to: invitation.email,
        organizationName: invitation.organization.name,
        inviterName: invitation.inviter.fullName || invitation.inviter.email || 'Someone',
        role: invitation.role,
        token: newToken,
        expiresAt: newExpiresAt,
      })
      console.log('✅ Email sent successfully')
    } catch (emailError) {
      console.error('⚠️ Failed to send invitation email:', emailError)
      // Don't fail the request if email fails, but log it
    }

    console.log('✅ Invitation resent successfully, returning response')
    return NextResponse.json({
      message: 'Invitation resent successfully',
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        expiresAt: updatedInvitation.expiresAt,
        organization: updatedInvitation.organization,
      },
    })

  } catch (error) {
    console.error('❌ Error resending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}