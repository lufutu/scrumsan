"use client"

import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { 
  User, 
  Tag, 
  AlertTriangle, 
  FileText, 
  Calendar,
  Hash,
  Type,
  Activity,
  Clock,
  ArrowRight,
  ChevronDown,
  CheckSquare,
  MessageSquare
} from 'lucide-react'

interface TaskActivity {
  id: string
  taskId: string
  userId: string
  activityType: string
  description: string
  oldValue?: string | null
  newValue?: string | null
  metadata?: Record<string, any> | null
  createdAt: string
  user: {
    id: string
    fullName?: string | null
    email?: string | null
    avatarUrl?: string | null
  }
}

interface TaskActivitiesProps {
  taskId: string
  className?: string
}

export function TaskActivities({ taskId, className }: TaskActivitiesProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const fetchActivities = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/activities`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching task activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [taskId])

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'created':
        return <FileText className="h-4 w-4" />
      case 'assigned':
      case 'unassigned':
        return <User className="h-4 w-4" />
      case 'priority_changed':
        return <AlertTriangle className="h-4 w-4" />
      case 'label_added':
      case 'label_removed':
        return <Tag className="h-4 w-4" />
      case 'status_changed':
        return <ArrowRight className="h-4 w-4" />
      case 'type_changed':
        return <Type className="h-4 w-4" />
      case 'story_points_changed':
        return <Hash className="h-4 w-4" />
      case 'due_date_changed':
        return <Calendar className="h-4 w-4" />
      case 'title_changed':
      case 'description_changed':
        return <FileText className="h-4 w-4" />
      case 'commented':
        return <MessageSquare className="h-4 w-4" />
      case 'checklist_created':
        return <CheckSquare className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const renderLabelBadge = (labelName: string, labelColor?: string) => {
    return (
      <Badge 
        key={labelName}
        style={{ 
          backgroundColor: labelColor || '#3B82F6',
          color: '#fff',
          border: 'none'
        }}
        className="ml-1 text-xs"
      >
        {labelName}
      </Badge>
    )
  }

  const enhanceDescription = (activity: TaskActivity) => {
    const { description, activityType, metadata } = activity
    
    // For label activities, show the actual label badge
    if (activityType === 'label_added' && metadata?.labelName) {
      const parts = description.split(metadata.labelName)
      return (
        <span>
          {parts[0]}
          {renderLabelBadge(metadata.labelName, metadata.labelColor)}
          {parts.slice(1).join(metadata.labelName)}
        </span>
      )
    }
    
    if (activityType === 'label_removed' && metadata?.labelName) {
      const parts = description.split(metadata.labelName)
      return (
        <span>
          {parts[0]}
          {renderLabelBadge(metadata.labelName, metadata.labelColor)}
          {parts.slice(1).join(metadata.labelName)}
        </span>
      )
    }
    
    return description
  }

  const formatActivityTime = (createdAt: string) => {
    const activityDate = new Date(createdAt)
    const now = new Date()
    const diffInHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return formatDistanceToNow(activityDate, { addSuffix: true })
    } else {
      return activityDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: activityDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder === 'asc' ? dateB - dateA : dateA - dateB
  })

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Activities</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-1" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Activities</h3>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleSortOrder}
          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activities yet</p>
              <p className="text-xs mt-1">Activities will appear here as changes are made to this item.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {sortedActivities.map((activity) => {
              const userName = activity.user.fullName || activity.user.email || 'Unknown User'
              
              return (
                <div key={activity.id} className="flex items-start gap-3 group">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <EnhancedAvatar
                      src={activity.user.avatarUrl}
                      fallbackSeed={activity.user.email || activity.user.fullName || 'U'}
                      size="sm"
                      className="h-8 w-8"
                      alt={userName}
                    />
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {/* Activity Icon */}
                      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                        {getActivityIcon(activity.activityType)}
                      </div>
                      
                      {/* Activity Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium text-green-600">{userName}</span>
                          {' '}
                          <span>{enhanceDescription(activity)}</span>
                        </p>
                        
                        {/* Timestamp */}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatActivityTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}