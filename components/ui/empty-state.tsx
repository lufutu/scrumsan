"use client"

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Kanban, 
  Folder, 
  FileText, 
  Search, 
  Zap,
  Heart,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react'

interface EmptyStateProps {
  type?: 'organizations' | 'boards' | 'projects' | 'tasks' | 'sprints' | 'search' | 'general'
  title?: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const defaultConfigs = {
  organizations: {
    icon: Building2,
    title: "Welcome to ScrumSan!",
    description: "Organizations help you collaborate with your team. Create your first organization to get started with project management.",
    actionLabel: "Create Organization"
  },
  boards: {
    icon: Kanban,
    title: "No boards yet",
    description: "Boards help you organize and track your work. Create your first board to start managing tasks and sprints.",
    actionLabel: "Create Board"
  },
  projects: {
    icon: Folder,
    title: "No projects found",
    description: "Projects help you organize related work and collaborate with your team. Create a project to get started.",
    actionLabel: "Create Project"
  },
  tasks: {
    icon: FileText,
    title: "No tasks yet",
    description: "Tasks are the building blocks of your project. Create your first task to start tracking work.",
    actionLabel: "Add Task"
  },
  sprints: {
    icon: Zap,
    title: "No sprints created",
    description: "Sprints help you plan and execute work in focused time periods. Create your first sprint to start.",
    actionLabel: "Create Sprint"
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "We couldn't find anything matching your search. Try adjusting your search terms or filters.",
    actionLabel: "Clear Search"
  },
  general: {
    icon: Heart,
    title: "Nothing here yet",
    description: "This space is waiting for content. Start by adding some items.",
    actionLabel: "Get Started"
  }
}

export function EmptyState({
  type = 'general',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = 'md',
  animated = true
}: EmptyStateProps) {
  const config = defaultConfigs[type]
  
  const finalTitle = title || config.title
  const finalDescription = description || config.description

  const sizeClasses = {
    sm: {
      container: 'py-8',
      iconSize: 'w-12 h-12',
      titleSize: 'text-lg',
      descSize: 'text-sm',
      maxWidth: 'max-w-sm'
    },
    md: {
      container: 'py-12',
      iconSize: 'w-16 h-16',
      titleSize: 'text-xl',
      descSize: 'text-base',
      maxWidth: 'max-w-md'
    },
    lg: {
      container: 'py-16',
      iconSize: 'w-20 h-20',
      titleSize: 'text-2xl',
      descSize: 'text-lg',
      maxWidth: 'max-w-lg'
    }
  }

  const sizeConfig = sizeClasses[size]

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizeConfig.container,
      className
    )}>
      {/* Animated Background Decoration */}
      {animated && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-20 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-br from-green-100 to-blue-100 rounded-full opacity-20 animate-pulse delay-1000" />
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full opacity-20 animate-pulse delay-500" />
        </div>
      )}

      <div className="relative z-10 space-y-6">
        {/* Icon Container */}
        <div className="relative">
          <div className={cn(
            "mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-6",
            "border-2 border-gray-200 shadow-sm",
            animated && "animate-in fade-in-0 zoom-in-95 duration-500"
          )}>
            {type === 'organizations' && <Building2 className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {type === 'boards' && <Kanban className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {type === 'projects' && <Folder className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {type === 'tasks' && <FileText className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {type === 'sprints' && <Zap className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {type === 'search' && <Search className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {type === 'general' && <Heart className={cn(sizeConfig.iconSize, "text-gray-400")} />}
            {icon && React.createElement(icon as React.ComponentType<any>, { 
              className: cn(sizeConfig.iconSize, "text-gray-400") 
            })}
          </div>
          
          {/* Sparkle decoration for certain types */}
          {(type === 'organizations' || type === 'boards') && animated && (
            <div className="absolute -top-2 -right-2">
              <div className="animate-bounce">
                {React.createElement(Sparkles, { className: "w-6 h-6 text-yellow-400" })}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn("space-y-3", sizeConfig.maxWidth, "mx-auto")}>
          <h3 className={cn(
            "font-semibold text-gray-900",
            sizeConfig.titleSize,
            animated && "animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-150"
          )}>
            {finalTitle}
          </h3>
          
          <p className={cn(
            "text-gray-600 leading-relaxed",
            sizeConfig.descSize,
            animated && "animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300"
          )}>
            {finalDescription}
          </p>
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-3 pt-2",
            animated && "animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-500"
          )}>
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                size="lg"
                className="shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                {React.createElement(Plus, { className: "w-4 h-4 mr-2" })}
                {action.label}
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || 'outline'}
                size="lg"
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                {secondaryAction.label}
                {React.createElement(ArrowRight, { className: "w-4 h-4 ml-2" })}
              </Button>
            )}
          </div>
        )}

        {/* Subtle hint text for first-time users */}
        {(type === 'organizations' || type === 'boards') && (
          <div className={cn(
            "pt-4 text-xs text-gray-400",
            animated && "animate-in fade-in-0 duration-500 delay-700"
          )}>
            ✨ Your journey to better project management starts here
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized empty state components for common use cases
export function OrganizationEmptyState({ 
  onCreateOrg, 
  className 
}: { 
  onCreateOrg: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="organizations"
      action={{
        label: "Create Your First Organization",
        onClick: onCreateOrg
      }}
      secondaryAction={{
        label: "Learn More",
        onClick: () => window.open('/docs/organizations', '_blank'),
        variant: 'outline'
      }}
      className={className}
      size="lg"
    />
  )
}

export function BoardEmptyState({ 
  onCreateBoard,
  onImportBoard,
  className 
}: { 
  onCreateBoard: () => void
  onImportBoard?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="boards"
      action={{
        label: "Create Board",
        onClick: onCreateBoard
      }}
      secondaryAction={onImportBoard ? {
        label: "Import Board",
        onClick: onImportBoard,
        variant: 'outline'
      } : undefined}
      className={className}
      size="lg"
    />
  )
}

export function ProjectEmptyState({ 
  onCreateProject,
  className 
}: { 
  onCreateProject: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="projects"
      title="Ready to start your first project?"
      description="Projects help you organize work, collaborate with teams, and track progress. Create a project to begin managing tasks and sprints."
      action={{
        label: "Create Project",
        onClick: onCreateProject
      }}
      className={className}
    />
  )
}

export function SearchEmptyState({ 
  onClearSearch,
  searchQuery,
  className 
}: { 
  onClearSearch: () => void
  searchQuery?: string
  className?: string 
}) {
  return (
    <EmptyState
      type="search"
      title={`No results for "${searchQuery}"`}
      description="We couldn't find anything matching your search. Try different keywords or check for typos."
      action={{
        label: "Clear Search",
        onClick: onClearSearch,
        variant: 'outline'
      }}
      className={className}
      size="sm"
      animated={false}
    />
  )
}

export function TaskEmptyState({ 
  onCreateTask,
  sprintName,
  className 
}: { 
  onCreateTask: () => void
  sprintName?: string
  className?: string 
}) {
  const title = sprintName ? `No tasks in ${sprintName}` : "No tasks yet"
  const description = sprintName 
    ? "This sprint doesn't have any tasks yet. Add tasks to start tracking work."
    : "Tasks are the building blocks of your project. Create your first task to get started."

  return (
    <EmptyState
      type="tasks"
      title={title}
      description={description}
      action={{
        label: "Add First Task",
        onClick: onCreateTask
      }}
      className={className}
      size="sm"
    />
  )
}

export function SprintEmptyState({ 
  onCreateSprint,
  className 
}: { 
  onCreateSprint: () => void
  className?: string 
}) {
  return (
    <EmptyState
      type="sprints"
      title="Time to create your first sprint!"
      description="Sprints help you focus on delivering value in short iterations. Create a sprint to start organizing your work."
      action={{
        label: "Create Sprint",
        onClick: onCreateSprint
      }}
      className={className}
    />
  )
}

// Loading state variant
export function LoadingEmptyState({ 
  message = "Loading...",
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12',
      className
    )}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 animate-pulse">{message}</p>
    </div>
  )
}