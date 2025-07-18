"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ITEM_TYPES, type ItemType } from '@/lib/constants'


interface ItemTypeSelectorProps {
  selectedType?: string
  onTypeChange?: (type: string) => void
  showDescription?: boolean
}

export default function ItemTypeSelector({
  selectedType = 'story',
  onTypeChange,
  showDescription = true
}: ItemTypeSelectorProps) {
  const selectedItemType = ITEM_TYPES.find(type => type.id === selectedType) || ITEM_TYPES[0]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Item Type</Label>
      
      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger>
          <SelectValue>
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${selectedItemType.bgColor}`}>
                <div className={selectedItemType.color}>
                  {selectedItemType.icon}
                </div>
              </div>
              <span>{selectedItemType.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-80">
          {ITEM_TYPES.map((type) => (
            <SelectItem key={type.id} value={type.id} className="p-3">
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2 rounded ${type.bgColor} flex-shrink-0`}>
                  <div className={type.color}>
                    {type.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{type.name}</div>
                  {showDescription && (
                    <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {type.description}
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showDescription && (
        <p className="text-xs text-gray-500 leading-relaxed">
          {selectedItemType.description}
        </p>
      )}
    </div>
  )
}

