"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, X, User, Tag, Calendar, AlertCircle } from 'lucide-react'
import { ITEM_TYPES, PRIORITIES, type ItemType } from '@/lib/constants'


interface User {
  id: string
  name: string
  initials: string
  avatar?: string
}

interface Label {
  id: string
  name: string
  color: string
}

interface EnhancedInlineFormProps {
  onAdd: (data: {
    title: string
    taskType: string
    assigneeId?: string
    labels?: string[]
    dueDate?: string
    priority?: string
  }) => Promise<void>
  onCancel: () => void
  placeholder?: string
  users?: User[]
  labels?: Label[]
  className?: string
}



export function EnhancedInlineForm({
  onAdd,
  onCancel,
  placeholder = "What needs to be done?",
  users = [],
  labels = [],
  className
}: EnhancedInlineFormProps) {
  const [input, setInput] = useState('')
  const [selectedTaskType, setSelectedTaskType] = useState<ItemType>(ITEM_TYPES[0])
  const [selectedAssignee, setSelectedAssignee] = useState<User | null>(null)
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([])
  const [selectedPriority, setSelectedPriority] = useState<string>('medium')
  const [dueDate] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionType, setSuggestionType] = useState<'type' | 'assign' | 'label' | 'priority'>('type')
  const [suggestionQuery, setSuggestionQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const parseInputForMentions = (text: string) => {
    const lastHashIndex = text.lastIndexOf('#')
    const lastAtIndex = text.lastIndexOf('@')
    const lastPlusIndex = text.lastIndexOf('+')
    const lastExclamationIndex = text.lastIndexOf('!')

    const indices = [
      { index: lastHashIndex, type: 'type', symbol: '#' },
      { index: lastAtIndex, type: 'assign', symbol: '@' },
      { index: lastPlusIndex, type: 'label', symbol: '+' },
      { index: lastExclamationIndex, type: 'priority', symbol: '!' }
    ].filter(item => item.index !== -1)

    if (indices.length === 0) {
      setShowSuggestions(false)
      return
    }

    const latest = indices.reduce((latest, current) => 
      current.index > latest.index ? current : latest
    )

    const afterSymbol = text.slice(latest.index + 1)
    const spaceIndex = afterSymbol.indexOf(' ')
    
    // If there's a space after the symbol, hide suggestions
    if (spaceIndex !== -1) {
      setShowSuggestions(false)
      return
    }

    const query = afterSymbol.toLowerCase()
    
    setSuggestionType(latest.type as 'type' | 'assign' | 'label' | 'priority')
    setSuggestionQuery(query)
    setShowSuggestions(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    parseInputForMentions(value)
  }

  const handleSuggestionSelect = (item: ItemType | User | Label | { id: string; name: string; }) => {
    const symbols = { type: '#', assign: '@', label: '+', priority: '!' }
    const symbol = symbols[suggestionType]
    
    const lastSymbolIndex = input.lastIndexOf(symbol)
    if (lastSymbolIndex === -1) return

    const beforeSymbol = input.slice(0, lastSymbolIndex)
    const afterSymbolEnd = lastSymbolIndex + suggestionQuery.length + 1
    const afterSymbol = afterSymbolEnd < input.length ? input.slice(afterSymbolEnd) : ''
    
    let newInput = beforeSymbol
    
    if (suggestionType === 'type') {
      setSelectedTaskType(item)
      newInput += `#${item.name.toLowerCase()} `
    } else if (suggestionType === 'assign') {
      setSelectedAssignee(item)
      newInput += `@${item.name} `
    } else if (suggestionType === 'label') {
      if (!selectedLabels.find(l => l.id === item.id)) {
        setSelectedLabels([...selectedLabels, item])
      }
      newInput += `+${item.name} `
    } else if (suggestionType === 'priority') {
      setSelectedPriority(item.id)
      newInput += `!${item.name} `
    }
    
    newInput += afterSymbol
    setInput(newInput)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const getSuggestions = () => {
    if (!showSuggestions) return []

    switch (suggestionType) {
      case 'type':
        if (suggestionQuery === '') {
          // Show all task types when just # is typed
          return ITEM_TYPES
        }
        return ITEM_TYPES.filter(type => 
          type.name.toLowerCase().includes(suggestionQuery) ||
          type.id.toLowerCase().includes(suggestionQuery)
        )
      case 'assign':
        if (suggestionQuery === '') {
          return users
        }
        return users.filter(user => 
          user.name.toLowerCase().includes(suggestionQuery)
        )
      case 'label':
        const availableLabels = labels.filter(label => 
          !selectedLabels.find(l => l.id === label.id)
        )
        if (suggestionQuery === '') {
          return availableLabels
        }
        return availableLabels.filter(label => 
          label.name.toLowerCase().includes(suggestionQuery)
        )
      case 'priority':
        if (suggestionQuery === '') {
          return PRIORITIES
        }
        return PRIORITIES.filter(priority => 
          priority.name.toLowerCase().includes(suggestionQuery)
        )
      default:
        return []
    }
  }

  const extractCleanTitle = (text: string) => {
    return text
      .replace(/#\w+/g, '')
      .replace(/@[\w\s]+/g, '')
      .replace(/\+\w+/g, '')
      .replace(/!\w+/g, '')
      .trim()
  }

  const handleSubmit = async () => {
    const cleanTitle = extractCleanTitle(input)
    if (!cleanTitle || isLoading) return

    setIsLoading(true)
    try {
      await onAdd({
        title: cleanTitle,
        taskType: selectedTaskType.id,
        assigneeId: selectedAssignee?.id,
        labels: selectedLabels.map(l => l.id),
        dueDate: dueDate || undefined,
        priority: selectedPriority !== 'medium' ? selectedPriority : undefined
      })
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        // TODO: Add keyboard navigation for suggestions
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        // Select first suggestion
        handleSuggestionSelect(suggestions[0])
        return
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false)
      } else {
        onCancel()
      }
    }
  }

  const suggestions = getSuggestions()

  return (
    <div className={cn("relative w-full", className)}>
      <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "w-6 h-6 rounded flex items-center justify-center text-sm",
              selectedTaskType.color,
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
            className="border-0 p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
            disabled={isLoading}
          />
          
          {/* Tags Display */}
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedAssignee && (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                <User className="h-3 w-3" />
                {selectedAssignee.name}
              </div>
            )}
            {selectedLabels.map(label => (
              <div 
                key={label.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: `${label.color}20`, color: label.color }}
              >
                <Tag className="h-3 w-3" />
                {label.name}
              </div>
            ))}
            {selectedPriority !== 'medium' && (
              <div className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs", 
                PRIORITIES.find(p => p.id === selectedPriority)?.color,
                PRIORITIES.find(p => p.id === selectedPriority)?.bgColor
              )}>
                <AlertCircle className="h-3 w-3" />
                {PRIORITIES.find(p => p.id === selectedPriority)?.name}
              </div>
            )}
            {dueDate && (
              <div className="flex items-center gap-1 bg-gray-50 text-gray-700 px-2 py-1 rounded text-xs">
                <Calendar className="h-3 w-3" />
                {new Date(dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Type # for task type, @ for assignee, + for labels, ! for priority
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

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestionType === 'type' && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 font-medium">
              Task Types
            </div>
          )}
          {suggestionType === 'assign' && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 font-medium">
              Assignees
            </div>
          )}
          {suggestionType === 'label' && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 font-medium">
              Labels
            </div>
          )}
          {suggestionType === 'priority' && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 font-medium">
              Priority
            </div>
          )}
          
          {suggestions.map((item, index) => (
            <button
              key={item.id || index}
              onClick={() => handleSuggestionSelect(item)}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-sm transition-colors"
            >
              {suggestionType === 'type' && (
                <>
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", item.color, item.bgColor)}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </>
              )}
              {suggestionType === 'assign' && (
                <>
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                    {item.initials}
                  </div>
                  <span className="font-medium">{item.name}</span>
                </>
              )}
              {suggestionType === 'label' && (
                <>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.name}</span>
                </>
              )}
              {suggestionType === 'priority' && (
                <>
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{item.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}