"use client"

import { useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Kanban, Calendar, Loader2 } from 'lucide-react'

interface BoardCreationWizardProps {
  projectId?: string
  organizationId?: string
  onSuccess?: () => void
  children?: React.ReactNode
}

type BoardType = 'kanban' | 'scrum'

interface WizardData {
  name: string
  type: BoardType
}

export default function BoardCreationWizard({ projectId, organizationId, onSuccess, children }: BoardCreationWizardProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    type: 'kanban'
  })

  const isStandalone = !projectId && organizationId

  const handleCreateBoard = async () => {
    if (!wizardData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Board name is required"
      })
      return
    }

    if (!projectId && !organizationId) {
      toast({
        title: "Error",
        description: "Either project ID or organization ID must be provided"
      })
      return
    }

    setIsCreating(true)

    try {
      // Create the board
      const boardData: any = {
        name: wizardData.name.trim(),
        board_type: wizardData.type
      }

      if (projectId) {
        boardData.project_id = projectId
      } else if (organizationId) {
        boardData.organization_id = organizationId
      }

      const { data: newBoard, error: boardError } = await supabase
        .from('boards')
        .insert(boardData)
        .select()
        .single()

      if (boardError) throw boardError

      // Create default columns based on board type
      let defaultColumns
      if (wizardData.type === 'kanban') {
        defaultColumns = [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 }
        ]
      } else {
        // Scrum board columns
        defaultColumns = [
          { name: 'Product Backlog', position: 0 },
          { name: 'Sprint Backlog', position: 1 },
          { name: 'In Progress', position: 2 },
          { name: 'Testing', position: 3 },
          { name: 'Done', position: 4 }
        ]
      }

      const { error: columnsError } = await supabase
        .from('board_columns')
        .insert(defaultColumns.map(col => ({
          ...col,
          board_id: newBoard.id
        })))

      if (columnsError) throw columnsError

      toast({
        title: "Success",
        description: `${wizardData.type === 'kanban' ? 'Kanban' : 'Scrum'} board created successfully`
      })

      // Reset wizard
      setIsOpen(false)
      setWizardData({
        name: '',
        type: 'kanban'
      })

      onSuccess?.()

    } catch (err: any) {
      console.error('Error creating board:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to create board"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Create New {isStandalone ? 'Standalone ' : ''}Board
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="boardName">Board Name *</Label>
            <Input
              id="boardName"
              placeholder="Enter board name"
              value={wizardData.name}
              onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="boardType">Board Type</Label>
            <Select 
              value={wizardData.type} 
              onValueChange={(value: BoardType) => setWizardData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kanban">
                  <div className="flex items-center gap-2">
                    <Kanban className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Kanban</div>
                      <div className="text-xs text-muted-foreground">Simple workflow management</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="scrum">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Scrum</div>
                      <div className="text-xs text-muted-foreground">Sprint-based development</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">
              {wizardData.type === 'kanban' ? 'Kanban Board' : 'Scrum Board'}
              {isStandalone && ' (Standalone)'}
            </div>
            <p className="text-sm text-muted-foreground">
              {wizardData.type === 'kanban' 
                ? "A simple one-page board with manageable lists of items. Perfect for continuous workflow management."
                : "A board with Product Backlog, Sprints, and analytics. Ideal for agile development teams using Scrum methodology."
              }
              {isStandalone && " This board will be independent of any specific project."}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBoard}
              disabled={isCreating || !wizardData.name.trim()}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Board
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 