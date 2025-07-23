"use client"

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, X, Plus } from 'lucide-react'
import { ITEM_TYPES, PRIORITIES, STORY_POINTS, type ItemType, type Priority } from '@/lib/constants'


interface User {
  id: string
  name: string
  initials: string
  avatar?: string
}

interface UserFromHook {
  id: string
  fullName: string
  email?: string
  avatarUrl?: string
  role?: string
}

interface Label {
  id: string
  name: string
  color: string
}

interface LabelFromHook {
  id: string
  name: string
  color: string | null
}

interface ComprehensiveInlineFormProps {
  onAdd: (data: {
    title: string
    taskType: string
    assignees?: Array<{ id: string }>
    labels?: string[]
    storyPoints?: number
    priority?: string
  }) => Promise<void>
  onCancel: () => void
  placeholder?: string
  className?: string
  users?: UserFromHook[]
  labels?: LabelFromHook[]
  compact?: boolean
}


export function ComprehensiveInlineForm({
  onAdd,
  onCancel,
  placeholder = "What needs to be done?",
  className,
  users = [],
  labels = [],
  compact = false
}: ComprehensiveInlineFormProps) {
  const [input, setInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedTaskType, setSelectedTaskType] = useState<ItemType>(ITEM_TYPES[0])
  const [selectedAssignee, setSelectedAssignee] = useState<User | null>(null)
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([])
  const [selectedPriority, setSelectedPriority] = useState<string>('medium')
  const [storyPoints, setStoryPoints] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && 
          containerRef.current && 
          dropdownRef.current &&
          !containerRef.current.contains(event.target as Node) && 
          !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setDropdownPosition(null)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Auto-resize input height based on content
  useEffect(() => {
    if (inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto'
      // Set height based on scrollHeight, with min/max constraints
      const scrollHeight = inputRef.current.scrollHeight
      const minHeight = 20 // minimum height in pixels
      const maxHeight = 120 // maximum height in pixels
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      inputRef.current.style.height = newHeight + 'px'
    }
  }, [input])

  const calculateDropdownPosition = () => {
    if (!containerRef.current || !inputRef.current) {
      return null
    }
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const inputRect = inputRef.current.getBoundingClientRect()
    
    return {
      top: inputRect.bottom + window.scrollY + 4, // 4px gap
      left: containerRect.left + window.scrollX,
      width: containerRect.width
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    
    // Check if user typed #
    const hashIndex = value.lastIndexOf('#')
    if (hashIndex !== -1) {
      const afterHash = value.slice(hashIndex + 1)
      const spaceIndex = afterHash.indexOf(' ')
      
      if (spaceIndex === -1) {
        // No space after #, show dropdown
        setFilterQuery(afterHash.toLowerCase())
        const position = calculateDropdownPosition()
        setDropdownPosition(position)
        setShowDropdown(true)
      } else {
        setShowDropdown(false)
        setDropdownPosition(null)
      }
    } else {
      setShowDropdown(false)
      setDropdownPosition(null)
    }
  }

  const handleItemSelect = (item: any, type: 'taskType' | 'assignee' | 'label' | 'priority' | 'points') => {
    const hashIndex = input.lastIndexOf('#')
    if (hashIndex !== -1) {
      const beforeHash = input.slice(0, hashIndex)
      const afterHashEnd = hashIndex + filterQuery.length + 1
      const afterHash = afterHashEnd < input.length ? input.slice(afterHashEnd) : ''
      
      let replacement = ''
      
      switch (type) {
        case 'taskType':
          setSelectedTaskType(item)
          replacement = `#${item.name.toLowerCase()} `
          break
        case 'assignee':
          setSelectedAssignee(item)
          replacement = `@${item.name} `
          break
        case 'label':
          if (!selectedLabels.find(l => l.id === item.id)) {
            setSelectedLabels(prev => [...prev, item])
          }
          replacement = `+${item.name} `
          break
        case 'priority':
          setSelectedPriority(item.id)
          replacement = `!${item.name.toLowerCase()} `
          break
        case 'points':
          setStoryPoints(item.value)
          replacement = `${item.value}pt `
          break
      }
      
      setInput(beforeHash + replacement + afterHash)
    }
    
    setShowDropdown(false)
    setDropdownPosition(null)
    inputRef.current?.focus()
  }

  const extractCleanTitle = (text: string) => {
    return text
      .replace(/#\w+/g, '')
      .replace(/@[\w\s]+/g, '')
      .replace(/\+\w+/g, '')
      .replace(/!\w+/g, '')
      .replace(/\d+pt/g, '')
      .trim()
  }

  // Transform users data to expected format
  const transformedUsers: User[] = users.map(user => ({
    id: user.id,
    name: user.fullName || user.email || 'Unknown User',
    initials: (user.fullName || user.email || 'Unknown User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    avatar: user.avatarUrl
  }))

  // Transform labels data to expected format
  const transformedLabels: Label[] = labels.map(label => ({
    id: label.id,
    name: label.name,
    color: label.color || '#6B7280'
  }))

  const getFilteredItems = () => {
    const allItems = [
      // Task Types
      ...ITEM_TYPES.map(type => ({ ...type, category: 'Task Types', itemType: 'taskType' as const })),
      // Assignees
      ...transformedUsers.map(user => ({ ...user, category: 'Assignees', itemType: 'assignee' as const })),
      // Labels
      ...transformedLabels.filter(label => !selectedLabels.find(l => l.id === label.id))
        .map(label => ({ ...label, category: 'Labels', itemType: 'label' as const })),
      // Priority
      ...PRIORITIES.map(priority => ({ ...priority, category: 'Priority', itemType: 'priority' as const })),
      // Story Points
      ...STORY_POINTS.map(points => ({ 
        id: points.toString(), 
        name: `${points} ${points === 1 ? 'point' : 'points'}`, 
        value: points,
        category: 'Story Points', 
        itemType: 'points' as const 
      }))
    ]
    
    if (filterQuery === '') {
      return allItems
    }
    
    return allItems.filter(item => 
      item.name.toLowerCase().includes(filterQuery) ||
      (item.itemType === 'taskType' && item.id.toLowerCase().includes(filterQuery))
    )
  }
  
  const filteredItems = getFilteredItems()
  
  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, any[]>)

  const handleSubmit = async () => {
    const cleanTitle = extractCleanTitle(input)
    if (!cleanTitle || isLoading) return

    setIsLoading(true)
    try {
      await onAdd({
        title: cleanTitle,
        taskType: selectedTaskType.id,
        assignees: selectedAssignee ? [{ id: selectedAssignee.id }] : [],
        labels: selectedLabels.map(l => l.id),
        storyPoints: storyPoints > 0 ? storyPoints : undefined,
        priority: selectedPriority !== 'medium' ? selectedPriority : undefined
      })
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && filteredItems.length > 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const firstItem = filteredItems[0]
        handleItemSelect(firstItem, firstItem.itemType)
        return
      }
    }
    
    if (e.key === 'Enter' && e.shiftKey && !showDropdown) {
      // Don't prevent default - let the input handle it naturally
      return
    } else if (e.key === 'Enter' && !e.shiftKey && !showDropdown) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      if (showDropdown) {
        setShowDropdown(false)
        setDropdownPosition(null)
      } else {
        onCancel()
      }
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "w-6 h-6 rounded flex items-center justify-center text-white text-sm",
              selectedTaskType.bgColor
            )}>
              {selectedTaskType.icon}
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {selectedTaskType.name}
            </span>
          </div>
          
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="border-0 p-0 h-auto min-h-[20px] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 font-medium break-words whitespace-pre-wrap overflow-hidden resize-none"
            disabled={isLoading}
            style={{ 
              wordWrap: 'break-word', 
              overflowWrap: 'break-word',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap'
            }}
          />
          
          {/* Selected Items Display */}
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedAssignee && (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">
                  {selectedAssignee.initials}
                </span>
                {selectedAssignee.name}
              </div>
            )}
            {selectedLabels.map(label => (
              <div 
                key={label.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: `${label.color}20`, color: label.color }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </div>
            ))}
            {selectedPriority !== 'medium' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                {PRIORITIES.find(p => p.id === selectedPriority)?.icon}
                {PRIORITIES.find(p => p.id === selectedPriority)?.name}
              </div>
            )}
            {storyPoints > 0 && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]">
                  {storyPoints}
                </span>
                {storyPoints === 1 ? 'point' : 'points'}
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Type # to select any attribute •
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!extractCleanTitle(input) || isLoading}
              className="h-7 px-2 text-xs bg-green-500 hover:bg-green-600"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Comprehensive Dropdown Portal */}
      {showDropdown && filteredItems.length > 0 && dropdownPosition && typeof window !== 'undefined' && (
        createPortal(
          <div 
            ref={dropdownRef}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] max-h-80 overflow-y-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: '320px'
            }}
          >
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 font-medium bg-gray-50">
                {category}
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleItemSelect(item, item.itemType)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm transition-colors"
                >
                  {item.itemType === 'taskType' && (
                    <>
                      <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white text-xs", item.bgColor)}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </>
                  )}
                  {item.itemType === 'assignee' && (
                    <>
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {item.initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </>
                  )}
                  {item.itemType === 'label' && (
                    <>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </>
                  )}
                  {item.itemType === 'priority' && (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </>
                  )}
                  {item.itemType === 'points' && (
                    <>
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                        {item.value}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          ))}
          </div>,
          document.body
        )
      )}
    </div>
  )
}