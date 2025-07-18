"use client"

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import PerformersSelector from './PerformersSelector'
import EstimationSelector from './EstimationSelector'
import ItemTypeSelector from './ItemTypeSelector'
import CustomFieldsEditor, { CustomField, CustomFieldValue } from './CustomFieldsEditor'
import LabelSelector from './LabelSelector'

export interface TaskFormData {
  title: string
  description: string
  taskType: string
  storyPoints: number
  effortUnits: number
  estimationType: 'story_points' | 'effort_units'
  itemValue: string
  assigneeIds: string[]
  reviewerIds: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  labels: Array<{ id: string; name: string; color: string }>
  customFieldValues: Array<{ customFieldId: string; value: string }>
}

interface TaskFormProps {
  formData: TaskFormData
  onFormDataChange: (data: TaskFormData) => void
  onSubmit: () => void
  onCancel: () => void
  boardId?: string
  users?: Array<{ id: string; fullName: string; email: string }>
  currentUserId?: string
  customFields?: CustomField[]
  boardConfig?: {
    effortUnitType: 'points' | 'hours' | 'custom'
    effortUnitName?: string
    itemValueOptions: string[]
  }
  isLoading?: boolean
  submitLabel?: string
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  taskType: 'story',
  storyPoints: 0,
  effortUnits: 0,
  estimationType: 'story_points',
  itemValue: '',
  assigneeIds: [],
  reviewerIds: [],
  priority: 'medium',
  labels: [],
  customFieldValues: []
}

const defaultBoardConfig = {
  effortUnitType: 'points' as const,
  itemValueOptions: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
}

export default function TaskForm({
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  boardId,
  users = [],
  currentUserId,
  customFields = [],
  boardConfig = defaultBoardConfig,
  isLoading = false,
  submitLabel = 'Create Item'
}: TaskFormProps) {
  const updateFormData = useCallback((updates: Partial<TaskFormData>) => {
    onFormDataChange({ ...formData, ...updates })
  }, [formData, onFormDataChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  const isSubmitDisabled = isLoading || !formData.title.trim()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input 
            id="title" 
            placeholder="Enter item title..." 
            value={formData.title}
            onChange={(e) => updateFormData({ title: e.target.value })}
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            placeholder="Enter item description..." 
            rows={3}
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      {/* Item Type */}
      <ItemTypeSelector
        selectedType={formData.taskType}
        onTypeChange={(type) => updateFormData({ taskType: type })}
      />

      {/* Performers (Assignees & Reviewers) */}
      <PerformersSelector
        boardId={boardId}
        currentUserId={currentUserId}
        selectedAssignees={formData.assigneeIds.map(id => users.find(u => u.id === id)).filter((user): user is NonNullable<typeof user> => user !== undefined)}
        selectedReviewers={formData.reviewerIds.map(id => users.find(u => u.id === id)).filter((user): user is NonNullable<typeof user> => user !== undefined)}
        users={users}
        onAssigneesChange={(assignees) => 
          updateFormData({ assigneeIds: assignees.map(a => a.id) })
        }
        onReviewersChange={(reviewers) => 
          updateFormData({ reviewerIds: reviewers.map(r => r.id) })
        }
      />

      {/* Estimation with Item Value and ROI */}
      <EstimationSelector
        storyPoints={formData.storyPoints}
        effortUnits={formData.effortUnits}
        estimationType={formData.estimationType}
        itemValue={formData.itemValue}
        effortUnitType={boardConfig.effortUnitType}
        effortUnitName={boardConfig.effortUnitName}
        itemValueOptions={boardConfig.itemValueOptions}
        onStoryPointsChange={(points) => 
          updateFormData({ storyPoints: points })
        }
        onEffortUnitsChange={(units) => 
          updateFormData({ effortUnits: units })
        }
        onEstimationTypeChange={(type) => 
          updateFormData({ estimationType: type })
        }
        onItemValueChange={(value) => 
          updateFormData({ itemValue: value })
        }
      />

      {/* Labels */}
      {boardId && (
        <div>
          <Label className="text-sm font-medium">Labels</Label>
          <div className="mt-2">
            <LabelSelector
              boardId={boardId}
              selectedLabels={formData.labels}
              onLabelsChange={(labels) => 
                updateFormData({ labels })
              }
            />
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select 
          value={formData.priority} 
          onValueChange={(value: any) => updateFormData({ priority: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Fields */}
      <CustomFieldsEditor
        customFields={customFields}
        customFieldValues={formData.customFieldValues.map(cf => ({
          id: '',
          customFieldId: cf.customFieldId,
          value: cf.value
        }))}
        onFieldValueChange={(fieldId, value) => {
          const currentValues = formData.customFieldValues
          const existingIndex = currentValues.findIndex(v => v.customFieldId === fieldId)
          
          let newValues
          if (existingIndex >= 0) {
            newValues = [...currentValues]
            newValues[existingIndex] = { ...newValues[existingIndex], value }
          } else {
            newValues = [...currentValues, { customFieldId: fieldId, value }]
          }
          
          updateFormData({ customFieldValues: newValues })
        }}
      />

      {/* Submit Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitDisabled}
        >
          {isLoading && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export { defaultFormData, defaultBoardConfig }
export type { TaskFormProps }