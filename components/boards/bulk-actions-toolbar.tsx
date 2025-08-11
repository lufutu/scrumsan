'use client'

import { useState } from 'react'
import { useMultiSelect } from '@/providers/multi-select-provider'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Archive, 
  Trash2, 
  X, 
  CheckSquare2, 
  Users, 
  Tag,
  Calendar,
  Flag,
  MoveRight
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

interface BulkActionsToolbarProps {
  boardId: string
  onRefresh: () => void
  totalTasks?: number
  allTasks?: any[]
}

export function BulkActionsToolbar({ boardId, onRefresh, totalTasks = 0, allTasks = [] }: BulkActionsToolbarProps) {
  const { 
    isMultiSelectMode, 
    getSelectedCount, 
    getSelectedTaskIds, 
    clearSelection, 
    toggleMultiSelectMode,
    selectAll 
  } = useMultiSelect()
  
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const selectedCount = getSelectedCount()
  const hasSelection = selectedCount > 0

  const handleBulkArchive = async () => {
    setIsProcessing(true)
    try {
      const taskIds = getSelectedTaskIds()
      const response = await fetch('/api/tasks/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds })
      })

      if (!response.ok) throw new Error('Failed to archive tasks')
      
      const result = await response.json()
      toast.success(`Archived ${result.count} task${result.count !== 1 ? 's' : ''}`)
      clearSelection()
      onRefresh()
    } catch (error) {
      toast.error('Failed to archive tasks')
      console.error('Bulk archive error:', error)
    } finally {
      setIsProcessing(false)
      setShowArchiveDialog(false)
    }
  }

  const handleBulkDelete = async () => {
    setIsProcessing(true)
    try {
      const taskIds = getSelectedTaskIds()
      const response = await fetch('/api/tasks/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds })
      })

      if (!response.ok) throw new Error('Failed to delete tasks')
      
      const result = await response.json()
      toast.success(`Deleted ${result.count} task${result.count !== 1 ? 's' : ''}`)
      clearSelection()
      toggleMultiSelectMode()
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete tasks')
      console.error('Bulk delete error:', error)
    } finally {
      setIsProcessing(false)
      setShowDeleteDialog(false)
    }
  }

  if (!isMultiSelectMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMultiSelectMode}
        className="gap-2"
      >
        <CheckSquare2 className="h-4 w-4" />
        Select Multiple
      </Button>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-2 p-3 bg-background border rounded-lg shadow-sm"
          >
            {/* Selection info */}
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm font-medium">
                {hasSelection ? (
                  <>
                    {selectedCount} of {totalTasks} selected
                  </>
                ) : (
                  'Select tasks to perform actions'
                )}
              </span>
              {totalTasks > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAll(allTasks)}
                  className="text-xs"
                >
                  Select All
                </Button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {hasSelection && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowArchiveDialog(true)}
                    disabled={isProcessing}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isProcessing}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>

                  <div className="w-px h-6 bg-border mx-2" />

                  {/* Future bulk actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="gap-2"
                    title="Coming soon"
                  >
                    <Users className="h-4 w-4" />
                    Assign
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="gap-2"
                    title="Coming soon"
                  >
                    <Tag className="h-4 w-4" />
                    Label
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="gap-2"
                    title="Coming soon"
                  >
                    <MoveRight className="h-4 w-4" />
                    Move
                  </Button>
                </>
              )}
            </div>

            {/* Clear/Cancel button */}
            <div className="ml-auto flex items-center gap-2">
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMultiSelectMode}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive confirmation dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived tasks will be hidden from the board but can be restored later.
              This action can be undone from the archived tasks view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkArchive}
              disabled={isProcessing}
            >
              {isProcessing ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              This action cannot be undone. The selected tasks and all their data 
              (comments, attachments, etc.) will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}