"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Search, Users, UserCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface User {
  id: string
  fullName: string | null
  avatarUrl: string | null
  email?: string
}

interface PerformersSelectorProps {
  boardId?: string
  projectId?: string
  organizationId?: string
  currentUserId?: string
  selectedAssignees?: User[]
  selectedReviewers?: User[]
  onAssigneesChange?: (assignees: User[]) => void
  onReviewersChange?: (reviewers: User[]) => void
  users?: User[]
}

export default function PerformersSelector({
  boardId,
  projectId,
  organizationId,
  currentUserId,
  selectedAssignees = [],
  selectedReviewers = [],
  onAssigneesChange,
  onReviewersChange,
  users = []
}: PerformersSelectorProps) {
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false)
  const [isReviewerPopoverOpen, setIsReviewerPopoverOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [reviewerSearch, setReviewerSearch] = useState('')

  const filteredAssigneeUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  const filteredReviewerUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(reviewerSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(reviewerSearch.toLowerCase())
  )

  const handleAssignToMyself = () => {
    if (!currentUserId) return
    
    let currentUser = users.find(user => user.id === currentUserId)
    
    // If current user is not in users array, create a fallback user object
    if (!currentUser) {
      currentUser = {
        id: currentUserId,
        fullName: 'You',
        email: undefined,
        avatarUrl: undefined
      }
    }

    const isAlreadyAssigned = selectedAssignees.some(assignee => assignee.id === currentUserId)
    
    if (!isAlreadyAssigned) {
      const newAssignees = [...selectedAssignees, currentUser]
      onAssigneesChange?.(newAssignees)
    }
    
    // Don't close popover - let users continue selecting
  }

  const handleToggleAssignee = (user: User) => {
    const isSelected = selectedAssignees.some(assignee => assignee.id === user.id)
    
    if (isSelected) {
      const newAssignees = selectedAssignees.filter(assignee => assignee.id !== user.id)
      onAssigneesChange?.(newAssignees)
    } else {
      const newAssignees = [...selectedAssignees, user]
      onAssigneesChange?.(newAssignees)
    }
  }

  const handleAssignMyselfAsReviewer = () => {
    if (!currentUserId) return
    
    let currentUser = users.find(user => user.id === currentUserId)
    
    // If current user is not in users array, create a fallback user object
    if (!currentUser) {
      currentUser = {
        id: currentUserId,
        fullName: 'You',
        email: undefined,
        avatarUrl: undefined
      }
    }

    const isAlreadyReviewer = selectedReviewers.some(reviewer => reviewer.id === currentUserId)
    
    if (!isAlreadyReviewer) {
      const newReviewers = [...selectedReviewers, currentUser]
      onReviewersChange?.(newReviewers)
    }
    
    // Don't close popover - let users continue selecting
  }

  const handleToggleReviewer = (user: User) => {
    const isSelected = selectedReviewers.some(reviewer => reviewer.id === user.id)
    
    if (isSelected) {
      const newReviewers = selectedReviewers.filter(reviewer => reviewer.id !== user.id)
      onReviewersChange?.(newReviewers)
    } else {
      const newReviewers = [...selectedReviewers, user]
      onReviewersChange?.(newReviewers)
    }
  }

  const handleRemoveAssignee = (userId: string) => {
    const newAssignees = selectedAssignees.filter(assignee => assignee.id !== userId)
    onAssigneesChange?.(newAssignees)
  }

  const handleRemoveReviewer = (userId: string) => {
    const newReviewers = selectedReviewers.filter(reviewer => reviewer.id !== userId)
    onReviewersChange?.(newReviewers)
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="space-y-4">
      {/* Assignees Section */}
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Assignees
        </Label>
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedAssignees.map((assignee) => (
              <Badge
                key={assignee.id}
                variant="outline"
                className="flex items-center gap-2 pr-1"
              >
                <Avatar className="w-4 h-4">
                  <AvatarImage src={assignee.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(assignee.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{assignee.fullName || assignee.email || 'Unknown User'}</span>
                <button
                  onClick={() => handleRemoveAssignee(assignee.id)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6">
                  <Plus className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Assign Performers</h4>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search team members..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {currentUserId && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAssignToMyself()
                        }}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Assign to myself
                      </Button>
                      <Separator />
                    </>
                  )}
                  
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredAssigneeUsers.map((user) => {
                      const isSelected = selectedAssignees.some(assignee => assignee.id === user.id)
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleToggleAssignee(user)}
                          className={`w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50 border border-blue-200' : ''
                          }`}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{user.fullName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500 truncate">{user.email || 'No email'}</div>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              Assigned
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                    
                    {filteredAssigneeUsers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No team members found
                      </p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Reviewers Section */}
      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Reviewers
        </Label>
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedReviewers.map((reviewer) => (
              <Badge
                key={reviewer.id}
                variant="outline"
                className="flex items-center gap-2 pr-1 border-green-200 text-green-800"
              >
                <Avatar className="w-4 h-4">
                  <AvatarImage src={reviewer.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(reviewer.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{reviewer.fullName || reviewer.email || 'Unknown User'}</span>
                <button
                  onClick={() => handleRemoveReviewer(reviewer.id)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            <Popover open={isReviewerPopoverOpen} onOpenChange={setIsReviewerPopoverOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6">
                  <Plus className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Assign Reviewers</h4>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search team members..."
                      value={reviewerSearch}
                      onChange={(e) => setReviewerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {currentUserId && (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAssignMyselfAsReviewer()
                        }}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Assign myself as reviewer
                      </Button>
                      <Separator />
                    </>
                  )}
                  
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredReviewerUsers.map((user) => {
                      const isSelected = selectedReviewers.some(reviewer => reviewer.id === user.id)
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleToggleReviewer(user)}
                          className={`w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-gray-50 ${
                            isSelected ? 'bg-green-50 border border-green-200' : ''
                          }`}
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{user.fullName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500 truncate">{user.email || 'No email'}</div>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Reviewer
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                    
                    {filteredReviewerUsers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No team members found
                      </p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}