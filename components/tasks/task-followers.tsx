"use client"

import React, { useState, useEffect } from 'react'
import { Plus, X, Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'

interface TaskFollower {
  id: string
  taskId: string
  userId: string
  createdAt: string
  user: {
    id: string
    fullName?: string | null
    email?: string | null
    avatarUrl?: string | null
  }
}

interface OrganizationMember {
  id: string
  userId: string
  user: {
    id: string
    fullName?: string | null
    email?: string | null
    avatarUrl?: string | null
  }
}

interface TaskFollowersProps {
  taskId: string
  organizationId: string
  className?: string
}

export function TaskFollowers({ taskId, organizationId, className }: TaskFollowersProps) {
  const [followers, setFollowers] = useState<TaskFollower[]>([])
  const [availableMembers, setAvailableMembers] = useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const fetchFollowers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/followers`)
      if (response.ok) {
        const data = await response.json()
        setFollowers(data)
      }
    } catch (error) {
      console.error('Error fetching task followers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableMembers = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      if (response.ok) {
        const data = await response.json()
        setAvailableMembers(data)
      }
    } catch (error) {
      console.error('Error fetching organization members:', error)
    }
  }

  const addFollower = async () => {
    if (!selectedUserId) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/followers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId })
      })

      if (response.ok) {
        const newFollower = await response.json()
        setFollowers(prev => [...prev, newFollower])
        setSelectedUserId('')
        toast.success('Follower added successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add follower')
      }
    } catch (error) {
      console.error('Error adding follower:', error)
      toast.error('Failed to add follower')
    }
  }

  const removeFollower = async (userId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/followers?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFollowers(prev => prev.filter(f => f.userId !== userId))
        toast.success('Follower removed')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove follower')
      }
    } catch (error) {
      console.error('Error removing follower:', error)
      toast.error('Failed to remove follower')
    }
  }

  const getAvailableUsersToAdd = () => {
    const followerUserIds = new Set(followers.map(f => f.userId))
    return availableMembers.filter(member => !followerUserIds.has(member.userId))
  }

  useEffect(() => {
    fetchFollowers()
  }, [taskId])

  useEffect(() => {
    if (isDialogOpen) {
      fetchAvailableMembers()
    }
  }, [isDialogOpen, organizationId])

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Followers</span>
          <Badge variant="secondary" className="text-xs">
            {followers.length}
          </Badge>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-1">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Followers</DialogTitle>
              <DialogDescription>
                Add team members to follow this task and receive notifications about updates.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Follower</label>
                <div className="flex gap-2">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableUsersToAdd().map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          <div className="flex items-center gap-2">
                            <EnhancedAvatar
                              src={member.user.avatarUrl}
                              fallbackSeed={member.user.email || member.user.fullName || 'U'}
                              size="xs"
                              className="h-5 w-5"
                            />
                            <span>{member.user.fullName || member.user.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={addFollower} 
                    disabled={!selectedUserId}
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {followers.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Followers</label>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {followers.map((follower) => (
                        <div key={follower.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <EnhancedAvatar
                              src={follower.user.avatarUrl}
                              fallbackSeed={follower.user.email || follower.user.fullName || 'U'}
                              size="sm"
                              className="h-6 w-6"
                            />
                            <span className="text-sm">
                              {follower.user.fullName || follower.user.email}
                            </span>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFollower(follower.userId)}
                            className="h-auto p-1 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact follower list */}
      {followers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {followers.slice(0, 5).map((follower) => (
            <div key={follower.id} className="relative group">
              <EnhancedAvatar
                src={follower.user.avatarUrl}
                fallbackSeed={follower.user.email || follower.user.fullName || 'U'}
                size="xs"
                className="h-6 w-6 border-2 border-background"
                title={follower.user.fullName || follower.user.email || 'Unknown'}
              />
            </div>
          ))}
          
          {followers.length > 5 && (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-xs font-medium">
                +{followers.length - 5}
              </span>
            </div>
          )}
        </div>
      )}

      {followers.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          No followers yet. Click + to add team members.
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Loading followers...
        </p>
      )}
    </div>
  )
}