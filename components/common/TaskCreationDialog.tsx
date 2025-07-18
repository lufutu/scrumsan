'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import TaskForm, { TaskFormData, defaultBoardConfig } from '@/components/scrum/TaskForm'
import { useTaskForm } from '@/hooks/useTaskForm'
import { useUsers } from '@/hooks/useUsers'
import { useSupabase } from '@/providers/supabase-provider'
import { toast } from 'sonner'

export interface TaskCreationDialogProps {
  boardId?: string
  projectId?: string
  organizationId?: string
  onSuccess?: () => void
  trigger?: React.ReactNode
  customFields?: any[]
  boardConfig?: any
  defaultStatus?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function TaskCreationDialog({
  boardId,
  projectId,
  organizationId,
  onSuccess,
  trigger,
  customFields = [],
  boardConfig = defaultBoardConfig,
  defaultStatus = 'backlog',
  open,
  onOpenChange
}: TaskCreationDialogProps) {
  const { user } = useSupabase()
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen
  
  // Use our reusable hooks
  const { users, loading: usersLoading } = useUsers({ projectId, organizationId })
  const {
    formData,
    setFormData,
    errors,
    isLoading,
    submitForm,
    resetForm
  } = useTaskForm({
    onSuccess: () => {
      setIsOpen(false)
      onSuccess?.()
      toast.success('Task created successfully')
    }
  })

  const handleSubmit = async () => {
    const additionalData: Record<string, any> = {
      status: defaultStatus
    }

    if (boardId) additionalData.boardId = boardId
    if (projectId) additionalData.projectId = projectId
    if (organizationId) additionalData.organizationId = organizationId

    const result = await submitForm('/api/tasks', additionalData)
    if (!result.success && result.error) {
      toast.error(result.error)
    }
  }

  const handleCancel = () => {
    resetForm()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto p-0">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Create New Item</DialogTitle>
          </DialogHeader>
        </div>
        <div className="p-6">
        <TaskForm
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          boardId={boardId}
          users={users}
          currentUserId={user?.id}
          customFields={customFields}
          boardConfig={boardConfig}
          isLoading={isLoading || usersLoading}
          submitLabel="Create Task"
        />
          {errors.submit && (
            <div className="text-red-600 text-sm mt-2">
              {errors.submit}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}