import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSecureAuth, createErrorResponse } from '@/lib/api-auth-utils'

/**
 * GET /api/organizations/[id]/invitations
 * Get all pending invitations for an organization
 */
export const GET = withSecureAuth(
    'teamMembers.viewAll',
    {
        action: 'list_invitations',
        resourceType: 'invitation',
        logRequest: false,
        logResponse: false,
    }
)(async (req: NextRequest, { params }, authContext) => {
    try {
        const { id: organizationId } = await params

        const invitations = await prisma.teamInvitation.findMany({
            where: {
                organizationId,
                acceptedAt: null, // Only pending invitations
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
                permissionSet: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return Response.json({
            invitations,
            count: invitations.length,
        })

    } catch (error) {
        console.error('Error fetching pending invitations:', error)
        return createErrorResponse('Failed to fetch pending invitations', 500)
    }
}
)