'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { 
  Mail, 
  Clock, 
  MoreHorizontal, 
  Send, 
  Trash2, 
  AlertCircle,
  RefreshCw,
  Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePendingInvitations, useResendInvitation, useCancelInvitation, PendingInvitation } from '@/hooks/usePendingInvitations'
import { toast } from 'sonner'

interface PendingInvitationsTabProps {
  organizationId: string
  canManage: boolean
}

export function PendingInvitationsTab({ organizationId, canManage }: PendingInvitationsTabProps) {
  const { data: invitations, isLoading, error } = usePendingInvitations(organizationId)
  const resendMutation = useResendInvitation(organizationId)
  const cancelMutation = useCancelInvitation(organizationId)
  
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; invitation: PendingInvitation | null }>({
    open: false,
    invitation: null,
  })

  const handleResend = async (invitation: PendingInvitation) => {
    try {
      await resendMutation.mutateAsync(invitation.id)
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleCancel = async () => {
    if (!cancelDialog.invitation) return
    
    try {
      await cancelMutation.mutateAsync(cancelDialog.invitation.id)
      setCancelDialog({ open: false, invitation: null })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(inviteUrl)
    toast.success('Invitation link copied to clipboard')
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium text-destructive mb-2">
              Failed to load pending invitations
            </h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No pending invitations
            </h3>
            <p className="text-sm text-muted-foreground">
              All invitations have been accepted or there are no pending invitations.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Pending Invitations</h3>
          <p className="text-sm text-muted-foreground">
            {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting for acceptance
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                {canManage && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const expired = isExpired(invitation.expiresAt)
                const expiresIn = Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                
                return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          {invitation.jobTitle && (
                            <div className="text-xs text-muted-foreground">{invitation.jobTitle}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {invitation.inviter.fullName || invitation.inviter.email}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {expired ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {expired ? (
                          <span className="text-destructive">
                            Expired {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className={expiresIn <= 1 ? 'text-amber-600' : 'text-muted-foreground'}>
                            {expiresIn <= 0 ? 'Today' : `${expiresIn} day${expiresIn !== 1 ? 's' : ''}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    
                    {canManage && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-8 h-8 p-0"
                              aria-label={`Actions for ${invitation.email}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResend(invitation)}
                              disabled={resendMutation.isPending}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {expired ? 'Resend Invitation' : 'Resend'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyInviteLink(invitation.token)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setCancelDialog({ open: true, invitation })}
                              className="text-destructive focus:text-destructive"
                              disabled={cancelMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Cancel Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, invitation: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation for{' '}
              <span className="font-medium">{cancelDialog.invitation?.email}</span>?
              This action cannot be undone and they will no longer be able to accept the invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Invitation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}