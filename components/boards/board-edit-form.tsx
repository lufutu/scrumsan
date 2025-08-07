"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit2, Loader2, Upload, X } from 'lucide-react'
import { SingleImageUpload } from '@/components/ui/single-image-upload'
import Image from 'next/image'

interface Board {
  id: string
  name: string
  description?: string | null
  boardType?: string | null
  color?: string | null
  logo?: string | null
}

interface BoardEditFormProps {
  board: Board
  onSuccess?: () => void
  children?: React.ReactNode
}

const BOARD_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#F97316', label: 'Orange' },
]

export default function BoardEditForm({ board, onSuccess, children }: BoardEditFormProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [currentLogo, setCurrentLogo] = useState(board.logo)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || '',
    boardType: board.boardType || 'kanban',
    color: board.color || '#3B82F6',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Board name is required")
      return
    }

    console.log('✏️ Starting optimistic board update...')
    setIsLoading(true)

    // Show optimistic success immediately
    toast.success("Board updated successfully")
    setOpen(false)

    // Store original data for rollback
    const originalFormData = { ...formData }

    try {
      console.log('📡 Making board update API call...')
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          boardType: formData.boardType,
          color: formData.color,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update board')
      }

      console.log('✅ Board update confirmed by API')

      // Handle logo upload/removal
      if (removeLogo && currentLogo) {
        // Remove existing logo
        await fetch(`/api/boards/${board.id}/logo`, {
          method: 'DELETE',
        })
        setCurrentLogo(null)
      } else if (logoFile) {
        // Upload new logo
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        
        const logoResponse = await fetch(`/api/boards/${board.id}/logo`, {
          method: 'POST',
          body: logoFormData,
        })
        
        if (logoResponse.ok) {
          const { logo } = await logoResponse.json()
          setCurrentLogo(logo)
        }
      }
      
      // Call onSuccess callback after API confirmation
      onSuccess?.()
      
    } catch (err: any) {
      console.error('❌ Board update failed:', err)
      
      // Rollback optimistic changes
      toast.error(err.message || "Failed to update board")
      
      // Reopen form with original data
      setOpen(true)
      setFormData(originalFormData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form when dialog closes
      setFormData({
        name: board.name,
        description: board.description || '',
        boardType: board.boardType || 'kanban',
        color: board.color || '#3B82F6',
      })
      setLogoFile(null)
      setRemoveLogo(false)
      setCurrentLogo(board.logo)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Board</DialogTitle>
          <DialogDescription>
            Update your board details. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Board Name *</Label>
            <Input
              id="name"
              placeholder="Enter board name"
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
              placeholder="Enter board description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="boardType">Board Type</Label>
            <Select 
              value={formData.boardType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, boardType: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="scrum">Scrum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Board Color</Label>
            <div className="flex gap-2">
              {BOARD_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    formData.color === color.value 
                      ? 'border-gray-900 scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  disabled={isLoading}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="boardLogo">Board Logo</Label>
            {currentLogo && !removeLogo ? (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <Image
                    src={currentLogo}
                    alt="Board logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRemoveLogo(false)
                      setLogoFile(null)
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          setLogoFile(file)
                        }
                      }
                      input.click()
                    }}
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveLogo(true)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <SingleImageUpload
                onChange={setLogoFile}
                accept="image/*"
                maxSize={5}
                disabled={isLoading}
                placeholder="Upload board logo"
              />
            )}
            {removeLogo && (
              <p className="text-sm text-muted-foreground">
                Logo will be removed when you save changes.
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setRemoveLogo(false)}
                  className="ml-2 h-auto p-0"
                >
                  Cancel
                </Button>
              </p>
            )}
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
              Update Board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}