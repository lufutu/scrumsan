"use client"

import { useState } from 'react'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  description?: string
  clientName?: string
  clientEmail?: string
  startDate?: string
  endDate?: string
}

interface ProjectFormProps {
  project?: Project
  onSuccess?: () => void
}

export default function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const activeOrg = useActiveOrg()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    clientName: project?.clientName || '',
    clientEmail: project?.clientEmail || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeOrg) {
      toast.error("You must have an active organization")
      return
    }

    if (!formData.name.trim()) {
      toast.error("Project name is required")
      return
    }

    setIsLoading(true)

    try {
      const endpoint = project 
        ? `/api/projects/${project.id}` 
        : `/api/organizations/${activeOrg.id}/projects`
      
      const method = project ? 'PATCH' : 'POST'
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          clientName: formData.clientName.trim() || undefined,
          clientEmail: formData.clientEmail.trim() || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save project')
      }

      toast.success(project ? "Project updated successfully" : "Project created successfully")

      setOpen(false)
      setFormData({ 
        name: '', 
        description: '', 
        clientName: '', 
        clientEmail: '', 
        startDate: '', 
        endDate: '' 
      })
      onSuccess?.()
      
    } catch (err: any) {
      console.error('Error saving project:', err)
      toast.error(err.message || "Failed to save project")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when dialog closes
      setFormData({
        name: project?.name || '',
        description: project?.description || '',
        clientName: project?.clientName || '',
        clientEmail: project?.clientEmail || '',
        startDate: project?.startDate || '',
        endDate: project?.endDate || ''
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {project ? (
          <Button variant="outline" size="sm">
            Edit Project
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
        New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {project 
              ? 'Update your project details below.'
              : 'Add a new project to your organization. You can always edit these details later.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter project description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="Enter client name (optional)"
              value={formData.clientName}
              onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Client Email</Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="Enter client email (optional)"
              value={formData.clientEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 