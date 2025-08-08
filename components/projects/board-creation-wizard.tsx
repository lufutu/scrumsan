"use client"

import { useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, ChevronRight, ChevronLeft, Kanban, Calendar, BarChart3, Loader2, Sparkles } from 'lucide-react'
import { MagicTaskGenerator } from '@/components/ai/MagicTaskGenerator'

interface BoardCreationWizardProps {
  projectId?: string
  organizationId?: string
  onSuccess?: (newBoard?: { id?: string }) => void
  children?: React.ReactNode
}

type BoardType = 'kanban' | 'scrum'

interface WizardData {
  name: string
  type: BoardType
  organization_id: string
  useAI: boolean
  aiPrompt: string
}

export default function BoardCreationWizard({ projectId, organizationId, onSuccess, children }: BoardCreationWizardProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const activeOrg = useActiveOrg()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    type: 'kanban',
    organization_id: organizationId || (activeOrg as any)?.id || '',
    useAI: false,
    aiPrompt: ''
  })
  const [showMagicGenerator, setShowMagicGenerator] = useState(false)
  const [createdBoardId, setCreatedBoardId] = useState<string | null>(null)

  const totalSteps = 4

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

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
      // Create the board using the API
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: wizardData.name.trim(),
          projectId: projectId,
          organizationId: organizationId || wizardData.organization_id,
          boardType: wizardData.type
        })
      })

      if (!response.ok) throw new Error('Failed to create board')
      
      const newBoard = await response.json()

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

      // Create default columns using the API
      const columnsResponse = await fetch(`/api/boards/${newBoard.id}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: defaultColumns
        })
      })

      if (!columnsResponse.ok) throw new Error('Failed to create columns')

      toast({
        title: "Success",
        description: `${wizardData.type === 'kanban' ? 'Kanban' : 'Scrum'} board created successfully`
      })

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
      console.error('Error creating board:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to create board"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const resetWizard = () => {
    setIsOpen(false)
    setCurrentStep(1)
    setWizardData({
      name: '',
      type: 'kanban',
      organization_id: organizationId || (activeOrg as any)?.id || '',
      useAI: false,
      aiPrompt: ''
    })
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Kanban className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">New Board</h2>
                <p className="text-muted-foreground">
                  Create a new board to organize your work
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organization">ORGANIZATION *</Label>
                <div className="relative">
                  <div className="w-full p-3 bg-muted rounded-md text-sm">
                    {(activeOrg as any)?.name || 'No organization selected'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Organization under which new board will be created
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="boardName">BOARD TITLE *</Label>
                <Input
                  id="boardName"
                  placeholder="Enter board name"
                  value={wizardData.name}
                  onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Kanban className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Board Type</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  wizardData.type === 'scrum' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setWizardData(prev => ({ ...prev, type: 'scrum' }))}
              >
                <div className={`w-4 h-4 rounded-full border-2 ${
                  wizardData.type === 'scrum' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {wizardData.type === 'scrum' && (
                    <div className="w-2 h-2 rounded-full bg-white m-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold cursor-pointer">
                    Scrum
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    A Board with a Product Backlog, Sprints (periods of time during which you plan 
                    to do some amount of work organized into Items) and Burndown charts. Ideal 
                    for Scrum framework users and for organizing work into several periods.
                  </p>
                </div>
              </div>

              <div 
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  wizardData.type === 'kanban' ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setWizardData(prev => ({ ...prev, type: 'kanban' }))}
              >
                <div className={`w-4 h-4 rounded-full border-2 ${
                  wizardData.type === 'kanban' ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {wizardData.type === 'kanban' && (
                    <div className="w-2 h-2 rounded-full bg-white m-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold cursor-pointer">
                    Kanban
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    A simple one-page Board with manageable Lists of Items. By default, three 
                    Lists will be created: To Do, In Progress and Done. The best option for 
                    organizing work in one Board view within multiple Lists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-purple-100 p-4 rounded-lg">
                  <Sparkles className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Magic Box</h2>
                <p className="text-muted-foreground">
                  Let AI generate initial tasks for your board (optional)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  wizardData.useAI ? 'border-purple-300 bg-purple-50' : ''
                }`}
                onClick={() => setWizardData(prev => ({ ...prev, useAI: !prev.useAI }))}
              >
                <div className={`w-4 h-4 rounded-full border-2 ${
                  wizardData.useAI ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground'
                }`}>
                  {wizardData.useAI && (
                    <div className="w-2 h-2 rounded-full bg-white m-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold cursor-pointer flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Generate Tasks with AI
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Describe your project and let AI create a structured set of tasks automatically.
                    Perfect for getting started quickly with a well-organized backlog.
                  </p>
                </div>
              </div>

              <div 
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  !wizardData.useAI ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setWizardData(prev => ({ ...prev, useAI: false }))}
              >
                <div className={`w-4 h-4 rounded-full border-2 ${
                  !wizardData.useAI ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {!wizardData.useAI && (
                    <div className="w-2 h-2 rounded-full bg-white m-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold cursor-pointer">
                    Start with Empty Board
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create an empty board with default columns only. 
                    You can add tasks manually or use Magic Import later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-xl font-bold">
                    {wizardData.name.substring(0, 2).toUpperCase() || 'TC'}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{(activeOrg as any)?.name}</p>
                <h2 className="text-3xl font-bold">{wizardData.name}</h2>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
              <p className="text-sm text-muted-foreground">
                {wizardData.type === 'kanban' 
                  ? "A simple one-page Board with manageable Lists of Items. By default, three Lists will be created: To Do, In Progress and Done. The best option for organizing work in one Board view within multiple Lists."
                  : "A Board with a Product Backlog, Sprints (periods of time during which you plan to do some amount of work organized into Items) and Burndown charts. Ideal for Scrum framework users and for organizing work into several periods."
                }
              </p>
            </div>

            {wizardData.useAI && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">AI Magic Enabled</span>
                </div>
                <p className="text-sm text-purple-700">
                  After creating your board, you'll be prompted to generate initial tasks using AI.
                </p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[600px] sm:max-h-[700px]"
        aria-describedby="board-creation-description"
        onInteractOutside={(e) => {
          // Prevent closing during creation to avoid focus issues
          if (isCreating) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="sr-only">Create New Board</DialogTitle>
            <DialogDescription id="board-creation-description" className="sr-only">
              Step-by-step wizard to create a new board for your project
            </DialogDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          {/* Progress indicators */}
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i + 1 === currentStep 
                    ? 'bg-primary' 
                    : i + 1 < currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext}
                disabled={currentStep === 1 && !wizardData.name.trim()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreateBoard}
                disabled={isCreating || !wizardData.name.trim()}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Finish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* AI Task Generator Modal */}
      {createdBoardId && (
        <MagicTaskGenerator
          open={showMagicGenerator}
          onOpenChange={(open) => {
            setShowMagicGenerator(open)
            if (!open) {
              // User cancelled AI generation, just close wizard
              resetWizard()
              onSuccess?.({ id: createdBoardId })
            }
          }}
          boardId={createdBoardId}
          boardType={wizardData.type}
          organizationId={wizardData.organization_id}
          onTasksCreated={handleAITasksCreated}
          title={`Generate Tasks for ${wizardData.name}`}
          description={`Let AI create initial ${wizardData.type} tasks for your new board`}
          placeholder={`Describe what you want to build in ${wizardData.name}...`}
          maxTasks={15}
        />
      )}
    </Dialog>
  )
} 