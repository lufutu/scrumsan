"use client"

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Kanban, Calendar, Loader2 } from 'lucide-react'

interface BoardCreationWizardProps {
  organizationId: string
  onSuccess?: (newBoard?: { id?: string }) => void
  children?: React.ReactNode
}

type BoardType = 'kanban' | 'scrum'

interface WizardData {
  name: string
  type: BoardType
}

export default function BoardCreationWizard({ organizationId, onSuccess, children }: BoardCreationWizardProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    type: 'kanban'
  })

  const handleCreateBoard = async () => {
    if (!wizardData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Board name is required"
      })
      return
    }

    setIsCreating(true)

    try {
      const boardData = {
        name: wizardData.name.trim(),
        boardType: wizardData.type,
        organizationId: organizationId
      }

      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create board')
      }

      const newBoard = await response.json()

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

      onSuccess?.(newBoard)

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
      <DialogContent 
        className="sm:max-w-[500px]"
        aria-describedby="simple-board-creation-description"
        onInteractOutside={(e) => {
          // Prevent closing during creation to avoid focus issues
          if (isCreating) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Create New Board
          </DialogTitle>
          <DialogDescription id="simple-board-creation-description">
            Create a new board to organize your work and tasks
          </DialogDescription>
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
            </div>
            <p className="text-sm text-muted-foreground">
              {wizardData.type === 'kanban' 
                ? "A simple one-page board with manageable lists of items. Perfect for continuous workflow management."
                : "A board with Product Backlog, Sprints, and analytics. Ideal for agile development teams using Scrum methodology."
              }
              {" This board can be linked to projects later for team coordination."}
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