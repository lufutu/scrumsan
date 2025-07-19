'use client'

import { useState, useRef } from 'react'
import { useOrganization } from '@/providers/organization-provider'
import { useSupabase } from '@/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { FileUploadQueue, QueuedFile } from '@/components/ui/file-upload-queue'
// Removed uploadOrganizationLogo import - now using API endpoint

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) {
  const { refreshOrganizations } = useOrganization()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleLogoUpload = async (file: File) => {
    // Just return the file - we'll handle actual upload during form submission
    return { file }
  }

  const handleLogoUploadComplete = (queuedFile: QueuedFile, result: any) => {
    setLogoFile(queuedFile.file)
    // Create preview URL
    const previewUrl = URL.createObjectURL(queuedFile.file)
    setLogoPreview(previewUrl)
  }

  const handleLogoUploadError = (queuedFile: QueuedFile, error: string) => {
    toast.error(`Failed to process logo: ${error}`)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
      setLogoPreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First create the organization without logo
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create organization')
      }

      const newOrg = await response.json()

      // If there's a logo file, upload it via API
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        
        const logoResponse = await fetch(`/api/organizations/${newOrg.id}/logo`, {
          method: 'POST',
          body: logoFormData,
        })
        
        if (!logoResponse.ok) {
          const logoError = await logoResponse.json()
          throw new Error(logoError.error || 'Failed to upload logo')
        }
      }

      // Refresh organizations list
      await refreshOrganizations()
      
      toast.success('Organization created successfully!')

      // Reset form
      onOpenChange(false)
      setFormData({ name: '', description: '' })
      handleRemoveLogo()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Clean up preview URL when dialog closes
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
        setLogoPreview(null)
      }
      setLogoFile(null)
      setFormData({ name: '', description: '' })
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to manage your projects and team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter organization name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter organization description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                      onClick={handleRemoveLogo}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{logoFile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {logoFile ? `${(logoFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="mt-2"
                    >
                      Change Logo
                    </Button>
                  </div>
                </div>
              ) : (
                <FileUploadQueue
                  onFileUpload={handleLogoUpload}
                  onUploadComplete={handleLogoUploadComplete}
                  onUploadError={handleLogoUploadError}
                  multiple={false}
                  accept="image/*"
                  maxSize={5}
                  maxFiles={1}
                  disabled={isLoading}
                  autoUpload={true}
                  showQueue={false}
                  className="h-32"
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drag & drop your logo here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, WebP or SVG • Max 5MB
                    </p>
                  </div>
                </FileUploadQueue>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 