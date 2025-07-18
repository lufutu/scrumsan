"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineAddTaskProps {
  onAdd: (title: string) => Promise<void>
  className?: string
  placeholder?: string
}

export default function InlineAddTask({ 
  onAdd, 
  className,
  placeholder = "Enter task title..."
}: InlineAddTaskProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAdd = async () => {
    if (!title.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onAdd(title.trim())
      setTitle('')
      setIsAdding(false)
    } catch (error) {
      console.error('Error adding task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setTitle('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isAdding) {
    return (
      <div className={cn("flex justify-center pt-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border p-3", className)}>
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className="border-0 p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isLoading}
      />
      <div className="flex items-center justify-end gap-1 mt-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isLoading}
          className="h-7 px-2 text-xs"
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!title.trim() || isLoading}
          className="h-7 px-2 text-xs bg-green-500 hover:bg-green-600"
        >
          <Check className="h-3 w-3" />
          Save
        </Button>
      </div>
    </div>
  )
}