"use client"

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Kanban, Calendar, Loader2, Sparkles, Upload } from 'lucide-react'
import { SingleImageUpload } from '@/components/ui/single-image-upload'
import { MagicTaskGenerator } from '@/components/ai/MagicTaskGenerator'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface BoardCreationWizardProps {
  organizationId: string
  onSuccess?: (newBoard?: { id?: string }) => void
  children?: React.ReactNode
}

type BoardType = 'kanban' | 'scrum'

interface WizardData {
  name: string
  type: BoardType
  useAI: boolean
  aiPrompt: string
}

export default function BoardCreationWizard({ organizationId, onSuccess, children }: BoardCreationWizardProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [showMagicGenerator, setShowMagicGenerator] = useState(false)
  const [createdBoardId, setCreatedBoardId] = useState<string | null>(null)
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    type: 'kanban',
    useAI: false,
    aiPrompt: ''
  })

  const handleCreateBoard = async () => {
    if (!wizardData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Board name is required"
      })
      return
    }

    console.log('🏗️ Starting optimistic board creation...')
    setIsCreating(true)

    // Show optimistic success immediately
    toast({
      title: "Success",
      description: `${wizardData.type === 'kanban' ? 'Kanban' : 'Scrum'} board created successfully`
    })

    // Store original data for potential rollback
    const originalWizardData = { ...wizardData }
    const originalLogoFile = logoFile

    try {
      console.log('📡 Making board creation API call...')
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
      console.log('✅ Board creation confirmed by API:', newBoard.id)

      // If there's a logo file, upload it
      if (logoFile) {
        try {
          const logoFormData = new FormData()
          logoFormData.append('logo', logoFile)
          
          const logoResponse = await fetch(`/api/boards/${newBoard.id}/logo`, {
            method: 'POST',
            body: logoFormData,
          })
          
          if (!logoResponse.ok) {
            const logoError = await logoResponse.json()
            console.error('Failed to upload board logo:', logoError)
            // Don't fail the entire creation if logo upload fails
          }
        } catch (logoError) {
          console.error('Logo upload error:', logoError)
          // Don't fail the entire creation if logo upload fails
        }
      }

      // Store board ID for AI generation
      setCreatedBoardId(newBoard.id)

      // If AI is enabled, show Magic Task Generator
      if (wizardData.useAI) {
        setShowMagicGenerator(true)
        // Don't close the wizard yet - let AI generation complete first
      } else {
        // Reset wizard and close
        resetWizard()
        onSuccess?.(newBoard)
      }

    } catch (err: any) {
      console.error('❌ Board creation failed:', err)
      
      // Rollback optimistic changes
      toast({
        title: "Error",
        description: err.message || "Failed to create board"
      })

      // Restore wizard state
      setIsOpen(true)
      setWizardData(originalWizardData)
      setLogoFile(originalLogoFile)
    } finally {
      setIsCreating(false)
    }
  }

  const resetWizard = () => {
    setIsOpen(false)
    setWizardData({
      name: '',
      type: 'kanban',
      useAI: false,
      aiPrompt: ''
    })
    setLogoFile(null)
    setShowMagicGenerator(false)
    setCreatedBoardId(null)
  }

  const handleAITasksCreated = (tasks: any[]) => {
    // Tasks have been created successfully
    toast({
      title: "Success",
      description: `AI generated ${tasks.length} tasks successfully!`
    })
    
    // Reset wizard and close
    resetWizard()
    onSuccess?.({ id: createdBoardId })
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
          <div className="space-y-3">
            <Label htmlFor="boardName">Board Name *</Label>
            <div className="flex items-center gap-3">
              <Input
                id="boardName"
                placeholder="Enter board name"
                value={wizardData.name}
                onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1"
              />
              <div className="flex-shrink-0">
                <SingleImageUpload
                  onChange={setLogoFile}
                  accept="image/*"
                  maxSize={5}
                  disabled={isCreating}
                  placeholder="Logo"
                  variant="compact"
                  className="w-12 h-12"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Board logo is optional and appears next to the board name
            </p>
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

          {/* AI Magic Task Generator Section */}
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-medium text-purple-900">AI Magic Task Generator</h3>
            </div>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="useAI"
                checked={wizardData.useAI}
                onCheckedChange={(checked) => setWizardData(prev => ({ ...prev, useAI: checked as boolean }))}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="useAI" className="text-sm font-medium cursor-pointer">
                  Generate initial tasks with AI
                </Label>
                <p className="text-xs text-muted-foreground">
                  Describe your project and let AI create structured tasks automatically
                </p>
                
                {wizardData.useAI && (
                  <Textarea
                    placeholder="Describe what you want to build (e.g., 'A task management app with user authentication, task creation, and team collaboration features')"
                    value={wizardData.aiPrompt}
                    onChange={(e) => setWizardData(prev => ({ ...prev, aiPrompt: e.target.value }))}
                    rows={3}
                    className="text-sm"
                    disabled={isCreating}
                  />
                )}
              </div>
            </div>
            
            {wizardData.useAI && wizardData.aiPrompt && (
              <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-100 p-2 rounded">
                <Sparkles className="h-3 w-3" />
                <span>AI will generate tasks after board creation</span>
              </div>
            )}
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

        {/* Magic Task Generator Modal */}
        {showMagicGenerator && createdBoardId && (
          <MagicTaskGenerator
            isOpen={showMagicGenerator}
            onClose={() => {
              setShowMagicGenerator(false)
              resetWizard()
              onSuccess?.({ id: createdBoardId })
            }}
            boardId={createdBoardId}
            boardType={wizardData.type}
            organizationId={organizationId}
            initialPrompt={wizardData.aiPrompt}
            onTasksCreated={handleAITasksCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
} 