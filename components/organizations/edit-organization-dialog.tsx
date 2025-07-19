'use client'

import { useState, useRef, useEffect } from 'react'
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
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { FileUploadQueue, QueuedFile } from '@/components/ui/file-upload-queue'
// Removed uploadOrganizationLogo import - now using API endpoint
import { useOrganizationLogo } from '@/hooks/useOrganizationLogo'
import { Organization } from '@/hooks/useOrganizations'

interface EditOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
}: EditOrganizationDialogProps) {
  const { refreshOrganizations } = useOrganization()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Get current logo URL
  const { logoUrl: currentLogoUrl } = useOrganizationLogo(organization.id, organization.logo)

  // Reset form when organization changes
  useEffect(() => {
    setFormData({
      name: organization.name,
      description: organization.description || '',
    })
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(false)
  }, [organization])

  const handleLogoUpload = async (file: File) => {
    // Just return the file - we'll handle actual upload during form submission
    return { file }
  }

  const handleLogoUploadComplete = (queuedFile: QueuedFile, result: any) => {
    setLogoFile(queuedFile.file)
    setRemoveLogo(false)
    // Create preview URL
    const previewUrl = URL.createObjectURL(queuedFile.file)
    setLogoPreview(previewUrl)
  }

  const handleLogoUploadError = (queuedFile: QueuedFile, error: string) => {
    toast.error(`Failed to process logo: ${error}`)
  }

  const handleRemoveNewLogo = () => {
    setLogoFile(null)
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
      setLogoPreview(null)
    }
  }

  const handleRemoveCurrentLogo = () => {
    setRemoveLogo(true)
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
      let logoToUpdate = organization.logo

      // Handle logo changes
      if (logoFile) {
        // Upload new logo via API
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        
        const logoResponse = await fetch(`/api/organizations/${organization.id}/logo`, {
          method: 'POST',
          body: logoFormData,
        })
        
        if (!logoResponse.ok) {
          const logoError = await logoResponse.json()
          throw new Error(logoError.error || 'Failed to upload logo')
        }
        
        const logoResult = await logoResponse.json()
        logoToUpdate = logoResult.filename
      } else if (removeLogo) {
        // Remove logo via API
        const logoResponse = await fetch(`/api/organizations/${organization.id}/logo`, {
          method: 'DELETE',
        })
        
        if (!logoResponse.ok) {
          const logoError = await logoResponse.json()
          throw new Error(logoError.error || 'Failed to remove logo')
        }
        
        logoToUpdate = null
      }

      // Update organization
      const updateData = {
        name: formData.name,
        description: formData.description,
        ...(logoToUpdate !== organization.logo && { logo: logoToUpdate })
      }

      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update organization')
      }

      // Refresh organizations list
      await refreshOrganizations()
      
      toast.success('Organization updated successfully!')

      // Close dialog
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error updating organization:', error)
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
      setRemoveLogo(false)
      setFormData({
        name: organization.name,
        description: organization.description || '',
      })
    }
    onOpenChange(open)
  }

  // Determine what logo to show
  const getLogoDisplay = () => {
    if (logoPreview) {
      // Show new logo preview
      return (
        <div className="relative">
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            <Image
              src={logoPreview}
              alt="New logo preview"
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
            onClick={handleRemoveNewLogo}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )
    }

    if (currentLogoUrl && !removeLogo) {
      // Show current logo
      return (
        <div className="relative">
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            <Image
              src={currentLogoUrl}
              alt="Current logo"
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
            onClick={handleRemoveCurrentLogo}
            title="Remove current logo"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )
    }

    // Show upload placeholder
    return (
      <div
        className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update your organization information and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter organization description"
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              {logoPreview || (currentLogoUrl && !removeLogo) ? (
                <div className="flex items-center gap-4">
                  {getLogoDisplay()}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {logoFile?.name || 'Current logo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {logoFile ? `${(logoFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={logoFile ? handleRemoveNewLogo : handleRemoveCurrentLogo}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                      {!logoFile && (
                        <FileUploadQueue
                          onUpload={handleLogoUpload}
                          onUploadComplete={handleLogoUploadComplete}
                          onUploadError={handleLogoUploadError}
                          multiple={false}
                          accept="image/*"
                          maxSize={5}
                          maxFiles={1}
                          disabled={isLoading || isUploadingLogo}
                          className="h-8 inline-block"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            Change
                          </Button>
                        </FileUploadQueue>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <FileUploadQueue
                  onUpload={handleLogoUpload}
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

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 