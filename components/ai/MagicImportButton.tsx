"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MagicTaskGenerator } from './MagicTaskGenerator'
import { Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AITask } from '@/lib/ai/schemas'

interface MagicImportButtonProps {
  boardId: string
  boardType: 'scrum' | 'kanban'
  organizationId: string
  columnId?: string
  sprintId?: string
  columnName?: string
  onTasksCreated?: (tasks: any[]) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showText?: boolean
}

export function MagicImportButton({
  boardId,
  boardType,
  organizationId,
  columnId,
  sprintId,
  columnName,
  onTasksCreated,
  variant = 'outline',
  size = 'sm',
  className,
  showText = true
}: MagicImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getPlaceholder = () => {
    if (columnName) {
      return `Describe tasks for the "${columnName}" column...`
    }
    return "Describe what needs to be done and I'll create tasks for you..."
  }

  const getTitle = () => {
    if (columnName) {
      return `Magic Import for ${columnName}`
    }
    return 'Magic Import Tasks'
  }

  const getDescription = () => {
    if (columnName) {
      return `Generate tasks specifically for the "${columnName}" column`
    }
    return 'Transform your ideas into structured tasks'
  }

  const handleTasksCreated = (tasks: any[]) => {
    onTasksCreated?.(tasks)
    // Add optimistic UI update here if needed
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={cn(
          "gap-2 transition-colors",
          "hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700",
          "focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20",
          className
        )}
      >
        <Sparkles className="h-4 w-4 text-purple-600" />
        {showText && (
          <span className="text-sm font-medium">
            Magic Import
          </span>
        )}
      </Button>

      <MagicTaskGenerator
        open={isOpen}
        onOpenChange={setIsOpen}
        boardId={boardId}
        boardType={boardType}
        columnId={columnId}
        sprintId={sprintId}
        organizationId={organizationId}
        onTasksCreated={handleTasksCreated}
        placeholder={getPlaceholder()}
        title={getTitle()}
        description={getDescription()}
        maxTasks={5} // Smaller limit for column-specific imports
      />
    </>
  )
}

// Compact version for tight spaces
export function MagicImportIconButton({
  boardId,
  boardType,
  organizationId,
  columnId,
  sprintId,
  columnName,
  onTasksCreated,
  className
}: Omit<MagicImportButtonProps, 'variant' | 'size' | 'showText'>) {
  return (
    <MagicImportButton
      boardId={boardId}
      boardType={boardType}
      organizationId={organizationId}
      columnId={columnId}
      sprintId={sprintId}
      columnName={columnName}
      onTasksCreated={onTasksCreated}
      variant="ghost"
      size="icon"
      showText={false}
      className={cn("h-8 w-8 rounded-md", className)}
    />
  )
}