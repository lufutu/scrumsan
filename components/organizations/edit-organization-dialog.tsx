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
import { uploadOrganizationLogo } from '@/lib/supabase/storage'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please select a PNG, JPG, WebP or SVG image.')
        return
      }

      // Validate file size (5MB max)
      const maxSizeMB = 5
      const fileSizeInMB = file.size / (1024 * 1024)
      if (fileSizeInMB > maxSizeMB) {
        toast.error(`File size exceeds the maximum allowed size of ${maxSizeMB}MB`)
        return
      }

      setLogoFile(file)
      setRemoveLogo(false)
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
    }
  }

  const handleRemoveNewLogo = () => {
    setLogoFile(null)
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
      setLogoPreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
        // Upload new logo
        const { filename } = await uploadOrganizationLogo(organization.id, logoFile)
        logoToUpdate = filename
      } else if (removeLogo) {
        // Remove logo
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
              <div className="flex items-center gap-4">
                {getLogoDisplay()}
                
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {logoFile ? 'Change Logo' : currentLogoUrl && !removeLogo ? 'Update Logo' : 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WebP or SVG. Max 5MB.
                  </p>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
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