"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Type, Hash } from 'lucide-react'

interface CustomField {
  id: string
  name: string
  fieldType: 'text' | 'numeric'
  defaultValue?: string
  minValue?: number
  maxValue?: number
  isRequired: boolean
  position: number
}

interface CustomFieldValue {
  id: string
  customFieldId: string
  value: string
}

interface CustomFieldsEditorProps {
  customFields?: CustomField[]
  customFieldValues?: CustomFieldValue[]
  onFieldValueChange?: (fieldId: string, value: string) => void
}

export default function CustomFieldsEditor({
  customFields = [],
  customFieldValues = [],
  onFieldValueChange
}: CustomFieldsEditorProps) {
  const getFieldValue = (fieldId: string): string => {
    const fieldValue = customFieldValues.find(v => v.customFieldId === fieldId)
    return fieldValue?.value || ''
  }

  const handleValueChange = (fieldId: string, value: string) => {
    onFieldValueChange?.(fieldId, value)
  }

  const validateNumericValue = (field: CustomField, value: string): boolean => {
    if (field.fieldType !== 'numeric') return true
    
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return false
    
    if (field.minValue !== undefined && numValue < field.minValue) return false
    if (field.maxValue !== undefined && numValue > field.maxValue) return false
    
    return true
  }

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'numeric':
        return <Hash className="w-4 h-4" />
      default:
        return <Type className="w-4 h-4" />
    }
  }

  if (customFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4" />
        <Label className="text-sm font-medium">Custom Fields</Label>
      </div>
      
      <div className="space-y-3">
        {customFields
          .sort((a, b) => a.position - b.position)
          .map((field) => {
            const currentValue = getFieldValue(field.id)
            const isValid = validateNumericValue(field, currentValue)
            
            return (
              <Card key={field.id} className="border-gray-200">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-gray-500">
                        {getFieldIcon(field.fieldType)}
                      </div>
                      <Label className="text-sm font-medium">
                        {field.name}
                        {field.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Badge 
                        variant="outline" 
                        className="text-xs ml-auto"
                      >
                        {field.fieldType}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      {field.fieldType === 'text' ? (
                        <Input
                          value={currentValue}
                          onChange={(e) => handleValueChange(field.id, e.target.value)}
                          placeholder={field.defaultValue || `Enter ${field.name.toLowerCase()}`}
                          className={`text-sm ${field.isRequired && !currentValue ? 'border-red-300' : ''}`}
                        />
                      ) : (
                        <Input
                          type="number"
                          value={currentValue}
                          onChange={(e) => handleValueChange(field.id, e.target.value)}
                          placeholder={field.defaultValue || `Enter ${field.name.toLowerCase()}`}
                          min={field.minValue}
                          max={field.maxValue}
                          className={`text-sm ${
                            field.isRequired && !currentValue ? 'border-red-300' : 
                            !isValid ? 'border-red-300' : ''
                          }`}
                        />
                      )}
                      
                      {/* Field constraints info */}
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <div>
                          {field.fieldType === 'numeric' && (field.minValue !== undefined || field.maxValue !== undefined) && (
                            <span>
                              Range: {field.minValue ?? '∞'} - {field.maxValue ?? '∞'}
                            </span>
                          )}
                          {field.defaultValue && (
                            <span>Default: {field.defaultValue}</span>
                          )}
                        </div>
                        
                        {field.isRequired && !currentValue && (
                          <span className="text-red-500">Required</span>
                        )}
                        
                        {field.fieldType === 'numeric' && currentValue && !isValid && (
                          <span className="text-red-500">Invalid range</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>
      
      <div className="text-xs text-gray-500">
        Custom fields are configured by the Board Admin in Board Settings
      </div>
    </div>
  )
}

export type { CustomField, CustomFieldValue }