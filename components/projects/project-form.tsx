"use client"

import { useState } from 'react'
import { useSupabase } from '@/providers/supabase-provider'
import { useActiveOrg } from '@/hooks/useActiveOrg'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import { Tables } from '@/types/database'

type Project = Tables<'projects'>

interface ProjectFormProps {
  project?: Project
  onSuccess?: () => void
}

export default function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const { supabase, user } = useSupabase()
  const activeOrg = useActiveOrg()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !activeOrg) {
      toast({
        title: "Error",
        description: "You must be logged in and have an active organization"
      })
      return
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required"
      })
      return
    }

    setIsLoading(true)

    try {
      if (project) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })
          .eq('id', project.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Project updated successfully"
        })
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            organization_id: activeOrg.id,
            created_by: user.id
          })

        if (error) throw error

        toast({
          title: "Success", 
          description: "Project created successfully"
        })
      }

      setOpen(false)
      setFormData({ name: '', description: '' })
      onSuccess?.()
      
      // Refresh the page to show updated data
      window.location.reload()
      
    } catch (err: any) {
      console.error('Error saving project:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to save project"
      })
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
        description: project?.description || ''
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