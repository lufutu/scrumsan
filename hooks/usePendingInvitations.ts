import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface PendingInvitation {
  id: string
  email: string
  role: string
  jobTitle?: string
  permissionSetId?: string
  invitedBy: string
  token: string
  expiresAt: string
  createdAt: string
  organization: {
    id: string
    name: string
  }
  inviter: {
    fullName?: string
    email: string
  }
  permissionSet?: {
    name: string
  }
}

/**
 * Hook to fetch pending invitations for an organization
 */
export function usePendingInvitations(organizationId: string) {
  return useQuery<PendingInvitation[]>({
    queryKey: ['pendingInvitations', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`)
      if (!response.ok) {
        throw new Error('Failed to fetch pending invitations')
      }
      const data = await response.json()
      return data.invitations || []
    },
    enabled: !!organizationId,
  })
}

/**
 * Hook to resend an invitation
 */
export function useResendInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}/resend`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resend invitation')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Invitation resent successfully')
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', organizationId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Hook to cancel an invitation
 */
export function useCancelInvitation(organizationId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel invitation')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Invitation cancelled successfully')
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations', organizationId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}