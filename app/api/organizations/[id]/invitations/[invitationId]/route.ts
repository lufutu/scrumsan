import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/organizations/[id]/invitations/[invitationId]
 * Cancel a pending invitation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    console.log('🗑️ Cancel invitation API called')
    const { id: organizationId, invitationId } = await params
    console.log('📝 Params:', { organizationId, invitationId })
    
    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: true,
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
    
    console.log('🗑️ Deleting invitation')
    
    // Delete the invitation
    await prisma.teamInvitation.delete({
      where: { id: invitationId },
    })
    
    console.log('✅ Invitation cancelled successfully, returning response')
    return NextResponse.json({
      message: 'Invitation cancelled successfully',
      invitationId,
    })
    
  } catch (error) {
    console.error('❌ Error cancelling invitation:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}