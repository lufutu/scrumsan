"use client"

import { useState, useRef } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useToast } from '@/hooks/use-toast'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, ChevronRight, ChevronLeft, Kanban, Calendar, Upload, Loader2, Building2, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VivifyBoardCreationWizardProps {
  projectId?: string
  organizationId?: string
  onSuccess?: () => void
  children?: React.ReactNode
}

type BoardType = 'kanban' | 'scrum'

interface WizardData {
  boardLogo: File | null
  boardLogoPreview: string | null
  boardType: BoardType
  projectLogo: File | null
  projectLogoPreview: string | null
  projectName: string
  organizationId: string
  boardName: string
}

export default function VivifyBoardCreationWizard({ 
  projectId, 
  organizationId, 
  onSuccess, 
  children 
}: VivifyBoardCreationWizardProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const { activeOrg } = useActiveOrg()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const boardLogoRef = useRef<HTMLInputElement>(null)
  const projectLogoRef = useRef<HTMLInputElement>(null)

  const [wizardData, setWizardData] = useState<WizardData>({
    boardLogo: null,
    boardLogoPreview: null,
    boardType: 'scrum',
    projectLogo: null,
    projectLogoPreview: null,
    projectName: '',
    organizationId: organizationId || (activeOrg as any)?.id || '',
    boardName: ''
  })

  const totalSteps = projectId ? 3 : 5
  const isStandalone = !projectId && organizationId

  const handleFileUpload = (file: File, type: 'board' | 'project') => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        if (type === 'board') {
          setWizardData(prev => ({ 
            ...prev, 
            boardLogo: file, 
            boardLogoPreview: reader.result as string 
          }))
        } else {
          setWizardData(prev => ({ 
            ...prev, 
            projectLogo: file, 
            projectLogoPreview: reader.result as string 
          }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNext = () => {
    const nextStep = projectId ? (currentStep === 1 ? 2 : 5) : currentStep + 1
    if (nextStep <= totalSteps) {
      setCurrentStep(nextStep)
    }
  }

  const handlePrevious = () => {
    const prevStep = projectId ? (currentStep === 5 ? 2 : 1) : currentStep - 1
    if (prevStep >= 1) {
      setCurrentStep(prevStep)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true
      case 2: return wizardData.boardType !== null
      case 3: return true
      case 4: return wizardData.projectName.trim() !== ''
      case 5: return wizardData.boardName.trim() !== ''
      default: return false
    }
  }

  const handleCreateBoard = async () => {
    if (!canProceed()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields"
      })
      return
    }

    setIsCreating(true)

    try {
      let targetProjectId = projectId
      
      if (!projectId && !isStandalone) {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: wizardData.projectName.trim(),
            organization_id: wizardData.organizationId,
            status: 'active'
          })
          .select()
          .single()

        if (projectError) throw projectError
        targetProjectId = newProject.id
      }

      const boardData: any = {
        name: wizardData.boardName.trim() || `${wizardData.boardType.charAt(0).toUpperCase() + wizardData.boardType.slice(1)} Board`,
        board_type: wizardData.boardType,
        description: `A ${wizardData.boardType} board for ${isStandalone ? 'standalone work' : 'project management'}`
      }

      if (targetProjectId) {
        boardData.project_id = targetProjectId
      } else if (wizardData.organizationId) {
        boardData.organization_id = wizardData.organizationId
      }

      const { data: newBoard, error: boardError } = await supabase
        .from('boards')
        .insert(boardData)
        .select()
        .single()

      if (boardError) throw boardError

      const { data: template } = await supabase
        .from('board_templates')
        .select('columns')
        .eq('board_type', wizardData.boardType)
        .eq('is_default', true)
        .single()

      let defaultColumns
      if (template?.columns) {
        defaultColumns = template.columns as Array<{name: string, position: number}>
      } else {
        defaultColumns = wizardData.boardType === 'kanban' 
          ? [
              { name: 'To Do', position: 0 },
              { name: 'In Progress', position: 1 },
              { name: 'Done', position: 2 }
            ]
          : [
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
        description: `${wizardData.boardType === 'kanban' ? 'Kanban' : 'Scrum'} board created successfully`
      })

      setIsOpen(false)
      setCurrentStep(1)
      setWizardData({
        boardLogo: null,
        boardLogoPreview: null,
        boardType: 'scrum',
        projectLogo: null,
        projectLogoPreview: null,
        projectName: '',
        organizationId: organizationId || (activeOrg as any)?.id || '',
        boardName: ''
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-teal-500 text-white p-4 rounded-lg">
                  <Kanban className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Board Logo</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-teal-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
                <input
                  ref={boardLogoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'board')}
                  className="hidden"
                />
                
                {wizardData.boardLogoPreview ? (
                  <div className="space-y-3">
                    <img 
                      src={wizardData.boardLogoPreview} 
                      alt="Board logo preview" 
                      className="mx-auto h-24 w-24 object-cover rounded-lg"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => boardLogoRef.current?.click()}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Change Logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 mx-auto text-teal-300" />
                    <div>
                      <p className="text-white font-medium">Upload Board Logo</p>
                      <p className="text-teal-100 text-sm mt-1">Optional</p>
                      <p className="text-teal-200 text-xs mt-2">
                        Allowed extensions: png, jpg, gif, jpeg and webp.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => boardLogoRef.current?.click()}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-teal-500 text-white p-4 rounded-lg">
                  <Kanban className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Board Type</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                className={cn(
                  "flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all",
                  wizardData.boardType === 'scrum' 
                    ? 'border-teal-400 bg-teal-500/20' 
                    : 'border-white/20 hover:border-white/40'
                )}
                onClick={() => setWizardData(prev => ({ ...prev, boardType: 'scrum' }))}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center",
                  wizardData.boardType === 'scrum' 
                    ? 'border-teal-400 bg-teal-400' 
                    : 'border-white/40'
                )}>
                  {wizardData.boardType === 'scrum' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold cursor-pointer text-white">
                    Scrum
                  </Label>
                  <p className="text-sm text-teal-100 mt-1">
                    A Board with a Product Backlog, Sprints (periods of time during which you plan 
                    to do some amount of work organized into Items) and Burndown charts. Ideal 
                    for Scrum framework users and for organizing work into several periods.
                  </p>
                </div>
              </div>

              <div 
                className={cn(
                  "flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all",
                  wizardData.boardType === 'kanban' 
                    ? 'border-teal-400 bg-teal-500/20' 
                    : 'border-white/20 hover:border-white/40'
                )}
                onClick={() => setWizardData(prev => ({ ...prev, boardType: 'kanban' }))}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center",
                  wizardData.boardType === 'kanban' 
                    ? 'border-teal-400 bg-teal-400' 
                    : 'border-white/40'
                )}>
                  {wizardData.boardType === 'kanban' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-lg font-semibold cursor-pointer text-white">
                    Kanban
                  </Label>
                  <p className="text-sm text-teal-100 mt-1">
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
                <div className="bg-teal-500 text-white p-4 rounded-lg">
                  <FolderOpen className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Project Logo</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-teal-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
                <input
                  ref={projectLogoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'project')}
                  className="hidden"
                />
                
                {wizardData.projectLogoPreview ? (
                  <div className="space-y-3">
                    <div className="mx-auto h-24 w-24 bg-teal-600 rounded-lg flex items-center justify-center overflow-hidden">
                      <img 
                        src={wizardData.projectLogoPreview} 
                        alt="Project logo preview" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => projectLogoRef.current?.click()}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Change Logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto h-24 w-24 bg-teal-600 rounded-lg flex items-center justify-center">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Upload Project Logo</p>
                      <p className="text-teal-100 text-sm mt-1">Optional</p>
                      <p className="text-teal-200 text-xs mt-2">
                        Allowed extensions: png, jpg, gif, jpeg and webp.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => projectLogoRef.current?.click()}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="bg-teal-500 text-white p-4 rounded-lg">
                  <FolderOpen className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">New Project</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-white">ORGANIZATION *</Label>
                <div className="relative">
                  <div className="w-full p-3 bg-white/10 border border-white/20 rounded-md text-sm text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {(activeOrg as any)?.name || 'No organization selected'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-teal-200">
                  Organization under which new board will be created
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectName" className="text-white">PROJECT NAME *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter name..."
                  value={wizardData.projectName}
                  onChange={(e) => setWizardData(prev => ({ ...prev, projectName: e.target.value }))}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-pink-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                  SPDR
                </div>
              </div>
              <div>
                <p className="text-sm text-teal-200">{(activeOrg as any)?.name}</p>
                <h2 className="text-3xl font-bold text-white">
                  {wizardData.boardName || `${wizardData.boardType.charAt(0).toUpperCase() + wizardData.boardType.slice(1)} Board`}
                </h2>
              </div>
            </div>

            <div className="p-4 bg-white/10 rounded-lg border-l-4 border-teal-400">
              <p className="text-sm text-teal-100">
                {wizardData.boardType === 'kanban' 
                  ? "A simple one-page Board with manageable Lists of Items. By default, three Lists will be created: To Do, In Progress and Done. The best option for organizing work in one Board view within multiple Lists."
                  : "A Board with a Product Backlog, Sprints (periods of time during which you plan to do some amount of work organized into Items) and Burndown charts. Ideal for Scrum framework users and for organizing work into several periods."
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="boardName" className="text-white">Board Name</Label>
              <Input
                id="boardName"
                placeholder={`${wizardData.boardType.charAt(0).toUpperCase() + wizardData.boardType.slice(1)} Board`}
                value={wizardData.boardName}
                onChange={(e) => setWizardData(prev => ({ ...prev, boardName: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
            </div>
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
            Create Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] sm:max-h-[700px] bg-gradient-to-br from-teal-500 to-teal-600 border-0">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="sr-only">Create New Board</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8">
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => {
              const stepNum = projectId ? [1, 2, 5][i] : i + 1
              return (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    stepNum === currentStep 
                      ? 'bg-white' 
                      : stepNum < currentStep 
                        ? 'bg-white/70' 
                        : 'bg-white/30'
                  )}
                />
              )
            })}
          </div>

          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          <div className="flex justify-between pt-4 border-t border-white/20">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-white text-teal-600 hover:bg-white/90"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreateBoard}
                disabled={isCreating || !canProceed()}
                className="bg-white text-teal-600 hover:bg-white/90"
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Finish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 