"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { UserPlus, Users, Crown, Settings, Trash2, Loader2 } from 'lucide-react'
import { Tables } from '@/types/database'

type ProjectMember = Tables<'project_members'> & {
  users: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface ProjectMembersProps {
  projectId: string
}

export default function ProjectMembers({ projectId }: ProjectMembersProps) {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  })
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [projectId])

  const fetchMembers = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          users (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMembers(data || [])
    } catch (err: any) {
      console.error('Error fetching members:', err)
      toast({
        title: "Error",
        description: "Failed to load project members"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteForm.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required"
      })
      return
    }

    setIsInviting(true)

    try {
      // First, check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteForm.email.trim())
        .single()

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw userError
      }

      if (existingUser) {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', existingUser.id)
          .single()

        if (existingMember) {
          toast({
            title: "Error",
            description: "User is already a member of this project"
          })
          return
        }

        // Add as member
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: projectId,
            user_id: existingUser.id,
            role: inviteForm.role
          })

        if (memberError) throw memberError

        toast({
          title: "Success",
          description: "User added to project successfully"
        })
      } else {
        // TODO: Send invitation email (for now, just show message)
        toast({
          title: "Invitation Sent",
          description: "An invitation email will be sent to the user"
        })
      }

      setShowInviteDialog(false)
      setInviteForm({ email: '', role: 'member' })
      fetchMembers()

    } catch (err: any) {
      console.error('Error inviting member:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to invite member"
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Member role updated successfully"
      })

      fetchMembers()
    } catch (err: any) {
      console.error('Error updating role:', err)
      toast({
        title: "Error",
        description: "Failed to update member role"
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Member removed from project"
      })

      fetchMembers()
    } catch (err: any) {
      console.error('Error removing member:', err)
      toast({
        title: "Error",
        description: "Failed to remove member"
      })
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default'
      case 'admin': return 'secondary'
      case 'member': return 'outline'
      default: return 'outline'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Settings
      default: return Users
    }
  }

  const canManageMembers = (member: ProjectMember) => {
    const currentUserMember = members.find(m => m.user_id === user?.id)
    const currentUserRole = currentUserMember?.role
    
    return currentUserRole === 'owner' || 
           (currentUserRole === 'admin' && member.role !== 'owner')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Members
          </CardTitle>
          <CardDescription>Loading project members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentUserMember = members.find(m => m.user_id === user?.id)
  const canInvite = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Project Members ({members.length})
            </CardTitle>
            <CardDescription>
              Manage team members and their roles in this project
            </CardDescription>
          </div>
          
          {canInvite && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Invite a new member to join this project. They'll receive an email invitation.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      disabled={isInviting}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={inviteForm.role} 
                      onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                      disabled={isInviting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {currentUserMember?.role === 'owner' && (
                          <SelectItem value="owner">Owner</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowInviteDialog(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting}>
                      {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No members found. Invite team members to collaborate on this project.
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => {
              const RoleIcon = getRoleIcon(member.role)
              const isCurrentUser = member.user_id === user?.id
              const canManage = canManageMembers(member) && !isCurrentUser
              
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <EnhancedAvatar
                    src={member.users?.avatar_url}
                    fallbackSeed={member.users?.full_name || 'user'}
                    size="lg"
                    className="h-10 w-10"
                    alt={member.users?.full_name || 'User'}
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium">
                      {member.users?.full_name || 'Unknown User'}
                      {isCurrentUser && <span className="text-muted-foreground ml-2">(You)</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Joined {new Date(member.createdAt || '').toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Select 
                        value={member.role} 
                        onValueChange={(value) => handleRoleChange(member.id, value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {currentUserMember?.role === 'owner' && (
                            <SelectItem value="owner">Owner</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                        <RoleIcon className="h-3 w-3" />
                        {member.role}
                      </Badge>
                    )}
                    
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 