"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Bold, 
  Italic, 
  Link, 
  Code, 
  Image, 
  Table, 
  Info,
  Upload,
  X
} from 'lucide-react'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/animate-ui/radix/popover'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface EnhancedDescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  taskId?: string
}

export function EnhancedDescriptionField({
  value,
  onChange,
  placeholder = "Write a description...",
  className = "",
  taskId
}: EnhancedDescriptionFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Insert text at cursor position
  const insertText = useCallback((text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = value.substring(0, start)
    const after = value.substring(end)
    
    const newValue = before + text + after
    onChange(newValue)

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }, [value, onChange])

  // Format selected text or insert formatting
  const formatText = useCallback((prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    if (selectedText) {
      // Format selected text
      const formatted = prefix + selectedText + suffix
      const before = value.substring(0, start)
      const after = value.substring(end)
      onChange(before + formatted + after)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start, start + formatted.length)
      }, 0)
    } else {
      // Insert formatting markers
      const placeholder = prefix === '**' ? 'bold text' : 
                         prefix === '*' ? 'italic text' :
                         prefix === '`' ? 'code' :
                         prefix === '[' ? 'link text](url)' : 'text'
      insertText(prefix + placeholder + suffix)
    }
  }, [value, onChange, insertText])

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!taskId) {
      toast.error('Task ID required for image upload')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const attachment = await response.json()
      
      // Insert image markdown
      const imageMarkdown = `![${file.name}](${attachment.url})`
      insertText(imageMarkdown)
      
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }, [taskId, insertText])

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
    // Reset input
    e.target.value = ''
  }, [handleImageUpload])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      handleImageUpload(imageFile)
    }
  }, [handleImageUpload])

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 border border-slate-200 rounded-t-md bg-slate-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatText('**', '**')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatText('*', '*')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatText('`', '`')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatText('[', '](url)')}
          title="Link"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || !taskId}
          title="Upload Image"
        >
          {uploadingImage ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => insertText('\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n')}
          title="Table"
        >
          <Table className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Formatting Rules */}
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Formatting Rules"
            >
              <Info className="h-3 w-3 mr-1" />
              Formatting rules
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Formatting Rules</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Bold:</strong> **bold text** or __bold text__
                </div>
                <div>
                  <strong>Italic:</strong> *italic text* or _italic text_
                </div>
                <div>
                  <strong>Code:</strong> `inline code` or ```code block```
                </div>
                <div>
                  <strong>Links:</strong> [link text](https://example.com)
                </div>
                <div>
                  <strong>Images:</strong> ![alt text](image-url)
                </div>
                <div>
                  <strong>Tables:</strong>
                  <pre className="text-xs bg-slate-100 p-2 rounded mt-1">
{`| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`}
                  </pre>
                </div>
                <div>
                  <strong>Emojis:</strong> Use standard emojis 😀 🎉 ✅
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Text Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`min-h-[120px] resize-none border-slate-200 border-t-0 rounded-t-none focus:border-emerald-500 focus:ring-emerald-500 ${
            isDragging ? 'border-emerald-500 bg-emerald-50' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
        
        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-emerald-100 bg-opacity-75 border-2 border-dashed border-emerald-500 rounded-md flex items-center justify-center">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-sm text-emerald-700 font-medium">Drop images to upload</p>
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Drag&Drop or <button 
            type="button"
            className="text-emerald-600 hover:text-emerald-700 underline"
            onClick={() => fileInputRef.current?.click()}
          >
            select
          </button> images
        </span>
        <span>{value.length} characters</span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}