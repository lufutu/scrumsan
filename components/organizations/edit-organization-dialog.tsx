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
import { SingleImageUpload } from '@/components/ui/single-image-upload'
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
  const [removeLogo, setRemoveLogo] = useState(false)

  // Get current logo URL
  const { logoUrl: currentLogoUrl } = useOrganizationLogo(organization.id, organization.logo)

  // Reset form when organization changes
  useEffect(() => {
    setFormData({
      name: organization.name,
      description: organization.description || '',
    })
    setLogoFile(null)
    setRemoveLogo(false)
  }, [organization])

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file)
    setRemoveLogo(false)
  }

  const handleLogoRemove = () => {
    setLogoFile(null)
    setRemoveLogo(true)
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
      setLogoFile(null)
      setRemoveLogo(false)
      setFormData({
        name: organization.name,
        description: organization.description || '',
      })
    }
    onOpenChange(open)
  }

  // Determine current logo value for the component
  const getCurrentLogoValue = () => {
    if (removeLogo) return null
    return currentLogoUrl
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
              <SingleImageUpload
                value={getCurrentLogoValue()}
                onChange={handleLogoChange}
                onRemove={handleLogoRemove}
                accept="image/*"
                maxSize={5}
                disabled={isLoading}
                placeholder="Upload organization logo"
                aspectRatio="square"
                showFileName={true}
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