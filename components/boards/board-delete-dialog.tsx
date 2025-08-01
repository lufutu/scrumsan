"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface Board {
  id: string
  name: string
  _count?: {
    tasks: number
    sprints: number
  }
}

interface BoardDeleteDialogProps {
  board: Board
  onSuccess?: () => void
  redirectTo?: string | null
  children?: React.ReactNode
}

export default function BoardDeleteDialog({ 
  board, 
  onSuccess, 
  redirectTo = '/boards',
  children 
}: BoardDeleteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if it's because the board has content
        if (response.status === 400 && data.details) {
          throw new Error(
            `Cannot delete board: ${data.details.message}. ` +
            `(${data.details.tasks} tasks, ${data.details.sprints} sprints)`
          )
        }
        throw new Error(data.error || 'Failed to delete board')
      }

      toast.success("Board deleted successfully")
      setOpen(false)
      
      // Call onSuccess callback if provided
      onSuccess?.()
      
      // Redirect after deletion
      if (redirectTo) {
        router.push(redirectTo)
      }
      
    } catch (err: any) {
      console.error('Error deleting board:', err)
      toast.error(err.message || "Failed to delete board")
    } finally {
      setIsDeleting(false)
    }
  }

  const hasContent = (board._count?.tasks || 0) > 0 || (board._count?.sprints || 0) > 0

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Board
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Board: {board.name}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete this board? This action cannot be undone.
            </p>
            
            {hasContent && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800 font-medium">
                  Warning: This board contains content
                </p>
                <ul className="text-sm text-red-700 mt-1 ml-4 list-disc">
                  {board._count?.tasks ? (
                    <li>{board._count.tasks} task{board._count.tasks !== 1 ? 's' : ''}</li>
                  ) : null}
                  {board._count?.sprints ? (
                    <li>{board._count.sprints} sprint{board._count.sprints !== 1 ? 's' : ''}</li>
                  ) : null}
                </ul>
                <p className="text-sm text-red-700 mt-2">
                  Please delete or move all content before deleting the board.
                </p>
              </div>
            )}
            
            {!hasContent && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  All columns, settings, and configurations associated with this board will be permanently deleted.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || hasContent}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Board'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}